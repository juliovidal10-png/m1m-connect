$ErrorActionPreference = 'Stop'
$image = 'sha256:80735ce956451da6e0904fe0498064b9171cf5247bd2ce3bdb09b7d13b9a82d7'
$report = Join-Path ([Environment]::GetFolderPath('Desktop')) ('M1M_TF3A_BUNDLE_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.txt')
$utf8 = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText($report, '', $utf8)
$containerId = $null
$failed = $false
function Record-Line {
  param([string]$Text)
  [IO.File]::AppendAllText($report, $Text + [Environment]::NewLine, $utf8)
  Write-Host $Text
}
try {
  Record-Line 'OPERACAO=VERIFICAR_CODIGO_DA_IMAGEM_SEM_INICIAR_CONTAINER'
  foreach ($program in @('node','docker')) {
    if (-not (Get-Command $program -ErrorAction SilentlyContinue)) { throw ('Dependencia ausente: ' + $program) }
  }
  $typescript = Join-Path ([IO.Path]::GetTempPath()) 'm1m-tf3a-build-5dc5f569d0814824b7c078542f4d8f8f/evolution/node_modules/typescript'
  if (-not (Test-Path -LiteralPath $typescript -PathType Container)) { throw 'TypeScript do build anterior nao encontrado. Nao refazer build; devolver este relatorio.' }
  $found = & docker image inspect --format '{{.Id}}' $image
  if ($LASTEXITCODE -ne 0 -or $found.Trim() -ne $image) { throw 'Imagem confirmada nao esta disponivel. Nenhum download ou build sera feito.' }
  $work = Join-Path ([IO.Path]::GetTempPath()) ('m1m-tf3a-inspect-' + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $work | Out-Null
  $verifier = Join-Path $work 'verify-bundle.cjs'
  [IO.File]::WriteAllBytes($verifier, [Convert]::FromBase64String('J3VzZSBzdHJpY3QnOwovLyBBbmFsaXNhIEpTIGNvbW8gZGFkb3M7IGV4ZWN1dGEgc29tZW50ZSBmdW5jb2VzIGRvIG9ic2VydmFkb3IgZW0gc2FuZGJveC4KY29uc3QgZnMgPSByZXF1aXJlKCdub2RlOmZzJyk7CmNvbnN0IHZtID0gcmVxdWlyZSgnbm9kZTp2bScpOwpjb25zdCBhc3NlcnQgPSByZXF1aXJlKCdub2RlOmFzc2VydC9zdHJpY3QnKTsKY29uc3QgY3J5cHRvID0gcmVxdWlyZSgnbm9kZTpjcnlwdG8nKTsKY29uc3QgW2J1bmRsZSwgdHlwZXNjcmlwdFJvb3RdID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpOwppZiAoIWJ1bmRsZSB8fCAhdHlwZXNjcmlwdFJvb3QpIHRocm93IEVycm9yKCdJbmZvcm1lIGJ1bmRsZSBlIGNhbWluaG8gZG8gVHlwZVNjcmlwdCBsb2NhbC4nKTsKY29uc3QgdHMgPSByZXF1aXJlKHR5cGVzY3JpcHRSb290KTsKY29uc3Qgc291cmNlID0gZnMucmVhZEZpbGVTeW5jKGJ1bmRsZSwgJ3V0ZjgnKTsKY29uc3QgdHJlZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoJ21haW4uanMnLCBzb3VyY2UsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUsIHRzLlNjcmlwdEtpbmQuSlMpOwphc3NlcnQuZXF1YWwodHJlZS5wYXJzZURpYWdub3N0aWNzLmxlbmd0aCwgMCk7CmNvbnN0IGNhbmRpZGF0ZXMgPSBbXTsKZnVuY3Rpb24gd2Fsayhub2RlKSB7CiAgaWYgKHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG5vZGUpICYmIG5vZGUuZ2V0VGV4dCh0cmVlKS5pbmNsdWRlcygnW1RGMy1BIE9SSUdJTiBFVklERU5DRV0nKSkgY2FuZGlkYXRlcy5wdXNoKG5vZGUuZ2V0VGV4dCh0cmVlKSk7CiAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIHdhbGspOwp9CndhbGsodHJlZSk7CmFzc2VydC5lcXVhbChjYW5kaWRhdGVzLmxlbmd0aCwgMiwgJ0VzcGVyYWRhcyBkdWFzIGZ1bmNvZXMgY29tcGlsYWRhcyBkZSBvYnNlcnZhY2FvJyk7CmZ1bmN0aW9uIGV4ZXJjaXNlKGNvZGUsIHsgaW5zdGFuY2UgPSAnTTFNVGVzdGVJQScsIGVuYWJsZWQgPSB0cnVlLCBtb2RlID0gMG8xMDA2MDAsIGZhaWwgPSBmYWxzZSwgaGFuZGxlciA9ICdtZXNzYWdlcy51cHNlcnQnLCBjb3VudCA9IDEgfSA9IHt9KSB7CiAgY29uc3QgbGluZXMgPSBbXTsgbGV0IHJlYWRzID0gMDsKICBjb25zdCBvYnNlcnZlID0gdm0ucnVuSW5OZXdDb250ZXh0KCcoJyArIGNvZGUgKyAnKScsIHsKICAgIGNvbnNvbGU6IHsgbG9nKHRleHQpIHsgbGluZXMucHVzaCh0ZXh0KTsgfSB9LAogICAgcmVxdWlyZShuYW1lKSB7CiAgICAgIGlmIChbJ2NyeXB0bycsICdub2RlOmNyeXB0byddLmluY2x1ZGVzKG5hbWUpKSByZXR1cm4gY3J5cHRvOwogICAgICBhc3NlcnQub2soWydmcycsICdub2RlOmZzJ10uaW5jbHVkZXMobmFtZSksICdEZXBlbmRlbmNpYSBpbmVzcGVyYWRhJyk7CiAgICAgIHJldHVybiB7CiAgICAgICAgc3RhdFN5bmMoKSB7IHJlYWRzKys7IGlmIChmYWlsKSB0aHJvdyBFcnJvcignU0lNVUxBVEVEJyk7IHJldHVybiB7IHNpemU6IDIwMCwgbW9kZSwgaXNGaWxlKCkgeyByZXR1cm4gdHJ1ZTsgfSB9OyB9LAogICAgICAgIHJlYWRGaWxlU3luYygpIHsgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHsgZW5hYmxlZCwgc2VjcmV0OiAnaycucmVwZWF0KDY0KSB9KTsgfSwKICAgICAgfTsKICAgIH0sCiAgfSwgeyB0aW1lb3V0OiAxMDAwIH0pOwogIGNvbnN0IGlucHV0ID0geyBpbnN0YW5jZSwgaGFuZGxlciwgdHlwZTogJ2FwcGVuZCcsIHJlcXVlc3RJZDogJ1JBVy1SRVFVRVNUJywgbWVzc2FnZXM6IEFycmF5LmZyb20oeyBsZW5ndGg6IGNvdW50IH0sICgpID0+ICh7IGtleTogeyBpZDogJ1JBVy1JRCcsIHJlbW90ZUppZDogJ1JBVy1QSE9ORUBzLndoYXRzYXBwLm5ldCcsIHJlbW90ZUppZEFsdDogJ1JBVy1BTFRAbGlkJywgZnJvbU1lOiBmYWxzZSB9LCBtZXNzYWdlVGltZXN0YW1wOiAxLCBtZXNzYWdlOiB7IGNvbnZlcnNhdGlvbjogJ1JBVy1DT05URU5UJyB9LCBwdXNoTmFtZTogJ1JBVy1OQU1FJyB9KSksIGlzTGF0ZXN0OiB0cnVlLCBwcm9ncmVzczogNTAgfTsKICBjb25zdCBiZWZvcmUgPSBKU09OLnN0cmluZ2lmeShpbnB1dCk7CiAgb2JzZXJ2ZShpbnB1dCk7CiAgYXNzZXJ0LmVxdWFsKEpTT04uc3RyaW5naWZ5KGlucHV0KSwgYmVmb3JlLCAnT2JzZXJ2YWNhbyBhbHRlcm91IGVudHJhZGEnKTsKICByZXR1cm4geyBsaW5lcywgcmVhZHMgfTsKfQpmb3IgKGNvbnN0IFtpbmRleCwgY29kZV0gb2YgY2FuZGlkYXRlcy5lbnRyaWVzKCkpIHsKICBjb25zdCBvdGhlciA9IGV4ZXJjaXNlKGNvZGUsIHsgaW5zdGFuY2U6ICdvdGhlci1pbnN0YW5jZScgfSk7CiAgYXNzZXJ0LmVxdWFsKG90aGVyLmxpbmVzLmxlbmd0aCwgMCk7IGFzc2VydC5lcXVhbChvdGhlci5yZWFkcywgMCk7CiAgZm9yIChjb25zdCBvcHRzIG9mIFt7IGVuYWJsZWQ6IGZhbHNlIH0sIHsgbW9kZTogMG8xMDA2NDQgfSwgeyBmYWlsOiB0cnVlIH1dKSBhc3NlcnQuZXF1YWwoZXhlcmNpc2UoY29kZSwgb3B0cykubGluZXMubGVuZ3RoLCAwKTsKICBjb25zdCBmaXJzdCA9IGV4ZXJjaXNlKGNvZGUpLmxpbmVzWzBdOwogIGFzc2VydC5vayhmaXJzdCk7CiAgZm9yIChjb25zdCByYXcgb2YgWydSQVctSUQnLCAnUkFXLVBIT05FJywgJ1JBVy1BTFQnLCAnUkFXLUNPTlRFTlQnLCAnUkFXLU5BTUUnLCAnUkFXLVJFUVVFU1QnLCAnaycucmVwZWF0KDY0KV0pIGFzc2VydC5vayghZmlyc3QuaW5jbHVkZXMocmF3KSk7CiAgY29uc3QgcGFyc2UgPSB2YWx1ZSA9PiBKU09OLnBhcnNlKHZhbHVlLnNsaWNlKCdbVEYzLUEgT1JJR0lOIEVWSURFTkNFXSAnLmxlbmd0aCkpOwogIGNvbnN0IGRhdGEgPSBwYXJzZShmaXJzdCk7CiAgYXNzZXJ0LmVxdWFsKGRhdGEuY2xhc3NpZmljYXRpb24sICdVTkNMQVNTSUZJRUQnKTsgYXNzZXJ0LmVxdWFsKGRhdGEudXBzZXJ0VHlwZSwgJ2FwcGVuZCcpOwogIGFzc2VydC5lcXVhbChkYXRhLm1lc3NhZ2VzWzBdLmlkVG9rZW4sIHBhcnNlKGV4ZXJjaXNlKGNvZGUpLmxpbmVzWzBdKS5tZXNzYWdlc1swXS5pZFRva2VuKTsKICBjb25zdCBoaXN0b3J5ID0gcGFyc2UoZXhlcmNpc2UoY29kZSwgeyBoYW5kbGVyOiAnbWVzc2FnaW5nLWhpc3Rvcnkuc2V0JywgY291bnQ6IDEwMSB9KS5saW5lc1swXSk7CiAgYXNzZXJ0LmVxdWFsKGhpc3RvcnkudG90YWwsIDEwMSk7IGFzc2VydC5lcXVhbChoaXN0b3J5Lm1lc3NhZ2VzLmxlbmd0aCwgMTAwKTsgYXNzZXJ0LmVxdWFsKGhpc3RvcnkudHJ1bmNhdGVkLCB0cnVlKTsKICBjb25zb2xlLmxvZygnT0JTRVJWQURPUl9DT01QSUxBRE9fJyArIChpbmRleCArIDEpICsgJz1BUFJPVkFET19DT01fREVQRU5ERU5DSUFTX1NJTVVMQURBUycpOwp9CmNvbnNvbGUubG9nKCdCVU5ETEVfU0hBMjU2PScgKyBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2JykudXBkYXRlKHNvdXJjZSkuZGlnZXN0KCdoZXgnKSk7CmNvbnNvbGUubG9nKCdSRVNVTFRBRE89Q09MRVRPUkVTX0NPTVBJTEFET1NfVkVSSUZJQ0FET1NfU0VNX0VYRUNVVEFSX0VWT0xVVElPTicpOwo='))
  $created = & docker create --network none --read-only --cap-drop ALL --security-opt no-new-privileges --label m1m.tf3a.offline-check=true --entrypoint node $image --version
  if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel criar container parado para extrair arquivo.' }
  $created = ($created -join '').Trim()
  if ($created -notmatch '^[a-f0-9]{64}$') { throw 'Identificador de container inesperado; nao remover recursos manualmente.' }
  $containerId = $created
  Record-Line 'CONTAINER_TEMPORARIO=CRIADO_PARADO; NAO_SERA_INICIADO'
  $bundle = Join-Path $work 'main.js'
  & docker cp ($containerId + ':/evolution/dist/main.js') $bundle | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao copiar arquivo do container parado.' }
  $output = & node $verifier $bundle $typescript
  $nodeExit = $LASTEXITCODE
  foreach ($line in $output) { Record-Line ([string]$line) }
  if ($nodeExit -ne 0) { throw 'Verificacao do bundle falhou. Nao publicar imagem.' }
  Record-Line ('IMAGEM_VERIFICADA=' + $image)
  Record-Line 'LIMITES=Teste isolado dos coletores com dependencias simuladas; nao executa Evolution nem comprova banco, sessoes, replay ou contadores.'
} catch {
  $failed = $true
  Record-Line ('RESULTADO=INTERROMPIDO: ' + $_.Exception.Message)
} finally {
  if ($containerId) {
    & docker rm $containerId | Out-Host
    if ($LASTEXITCODE -eq 0) { Record-Line 'CONTAINER_TEMPORARIO=REMOVIDO_SEM_TER_SIDO_INICIADO' }
    else { $failed = $true; Record-Line ('LIMPEZA_PENDENTE_CONTAINER=' + $containerId) }
  }
  Record-Line ('RELATORIO=' + $report)
}
if ($failed) { exit 1 }
