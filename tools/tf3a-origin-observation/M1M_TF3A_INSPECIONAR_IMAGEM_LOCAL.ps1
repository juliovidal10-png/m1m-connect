$ErrorActionPreference = 'Stop'
$tag = 'm1m-tf3a-origin:review-20261027090348'
$report = Join-Path ([Environment]::GetFolderPath('Desktop')) ('M1M_TF3A_IMAGEM_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.txt')
$utf8 = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText($report, '', $utf8)
function Record-Line {
  param([string]$Text)
  [IO.File]::AppendAllText($report, $Text + [Environment]::NewLine, $utf8)
  Write-Host $Text
}
try {
  Record-Line 'OPERACAO=INSPECAO_LOCAL_SOMENTE_LEITURA'
  Record-Line ('IMAGEM_SOLICITADA=' + $tag)
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker nao encontrado. Nenhuma instalacao sera executada.' }
  $raw = & docker image inspect $tag
  if ($LASTEXITCODE -ne 0) { throw 'Consulta da imagem falhou. Nao refazer build ou remover imagens.' }
  $items = @(($raw -join "`n") | ConvertFrom-Json)
  if ($items.Count -ne 1) { throw 'Resposta da inspecao inesperada.' }
  $image = $items[0]
  $entrypoint = @($image.Config.Entrypoint)
  $cmd = $image.Config.Cmd
  $data = [ordered]@{
    ImageID = $image.Id
    RepoTags = @($image.RepoTags)
    RepoDigests = @($image.RepoDigests)
    OS = $image.Os
    Architecture = $image.Architecture
    Created = $image.Created
    Entrypoint = $entrypoint
    Cmd = $cmd
    SizeBytes = $image.Size
  }
  Record-Line ($data | ConvertTo-Json -Depth 5)
  if (@($image.RepoTags) -notcontains $tag) { throw 'Tag solicitada nao corresponde a imagem retornada.' }
  if ($image.Os -ne 'linux') { throw 'Imagem nao e Linux.' }
  if (($entrypoint -join '|') -ne 'node|dist/main.js') { throw 'Entrypoint diverge do candidato revisado.' }
  if ($null -ne $cmd -and @($cmd).Count -gt 0) { throw 'CMD nao esta vazio.' }
  $candidate = Join-Path ([IO.Path]::GetTempPath()) 'm1m-tf3a-build-5dc5f569d0814824b7c078542f4d8f8f/candidate.ts'
  if (Test-Path -LiteralPath $candidate -PathType Leaf) {
    $hash = (Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant()
    Record-Line ('CANDIDATO_LOCAL_SHA256=' + $hash)
    if ($hash -ne '235492380bc20b3737c1e06b65d93f47a399fdc8e63a5c90a743d77806a783bc') { throw 'Fonte candidata local diverge da fonte revisada.' }
  } else { Record-Line 'CANDIDATO_LOCAL=NAO_DISPONIVEL; hash nao verificado, sem refazer build.' }
  Record-Line 'RESULTADO=METADADOS_DA_IMAGEM_CONFERIDOS_SEM_INICIAR_CONTAINER'
  Record-Line 'LIMITES=Nao comprova conteudo interno, runtime, banco, sessoes ou correcao dos contadores.'
} catch {
  Record-Line ('RESULTADO=INTERROMPIDO: ' + $_.Exception.Message)
  exit 1
} finally {
  Record-Line ('RELATORIO=' + $report)
}
