"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";

type FaqItem = {
  question: string;
  answer: React.ReactNode;
};

type FaqCategory = {
  title: string;
  items: FaqItem[];
};

const categories: FaqCategory[] = [
  {
    title: "Acesso",
    items: [
      {
        question: "Como funciona o primeiro acesso ao M1M Connect?",
        answer: <>Depois que o usuário é cadastrado, o gestor pode gerar um convite individual em <strong>Configurações → Usuários e Permissões</strong>. O colaborador abre o link, cria a própria senha e depois acessa normalmente pela tela de login. O convite é válido por 24 horas, e a geração de um novo convite invalida o anterior.</>,
      },
      {
        question: "Esqueci minha senha. Como recuperar o acesso?",
        answer: <>Na tela de login, clique em <strong>Esqueci minha senha</strong>, informe o e-mail cadastrado e selecione <strong>Enviar instruções</strong>. O link enviado por e-mail é válido por 60 minutos e pode ser utilizado apenas uma vez. Abra o link, crie a nova senha e depois volte ao login. Se o link expirar ou já tiver sido utilizado, solicite um novo.</>,
      },
      {
        question: "Meu período de teste terminou. O que acontece?",
        answer: <>Quando o período de teste termina, o acesso operacional da empresa ao M1M Connect é bloqueado, mas os dados da empresa permanecem preservados. Entre em contato com o suporte da M1M para verificar a continuidade e a reativação do acesso.</>,
      },
      {
        question: "Minha empresa foi reativada. Preciso criar uma nova conta ou senha?",
        answer: <>Não apenas por causa da reativação. A empresa e os usuários existentes são preservados. A reativação, por si só, não exige novo cadastro, novo convite ou redefinição de senha.</>,
      },
      {
        question: "Depois da reativação, preciso conectar o WhatsApp novamente?",
        answer: <>Não necessariamente. A reativação do acesso não desconecta automaticamente a sessão do WhatsApp. Acesse <strong>Configurações → WhatsApp</strong> e verifique o status. Se estiver <strong>Conectado</strong>, não é necessário gerar outro QR Code. Se estiver <strong>Desconectado</strong>, faça a reconexão.</>,
      },
    ],
  },
  {
    title: "WhatsApp",
    items: [
      {
        question: "Como conectar o WhatsApp da empresa?",
        answer: <>Acesse <strong>Configurações → WhatsApp</strong> e utilize <strong>Conectar WhatsApp</strong>. Gere o QR Code e, no WhatsApp da empresa, abra <strong>Dispositivos conectados → Conectar um dispositivo</strong> para fazer a leitura. Aguarde o status aparecer como <strong>Conectado</strong>.</>,
      },
      {
        question: "Meu WhatsApp aparece como desconectado. O que faço?",
        answer: <>Acesse <strong>Configurações → WhatsApp</strong> e verifique o <strong>Status da conexão</strong>. Se estiver <strong>Desconectado</strong>, inicie a conexão e faça a leitura do QR Code com o WhatsApp da empresa. Se as ações de conexão não estiverem disponíveis para seu usuário, procure o gestor da empresa.</>,
      },
      {
        question: "Preciso escanear o QR Code todos os dias?",
        answer: <>Não. O QR Code é necessário para conectar ou reconectar o WhatsApp quando a sessão estiver desconectada. Se o status estiver como <strong>Conectado</strong>, não é necessário escanear outro QR Code.</>,
      },
      {
        question: "Os colaboradores precisam conectar o próprio WhatsApp?",
        answer: <>Não. A conexão utilizada pelo M1M Connect é o <strong>WhatsApp da empresa</strong>. Os colaboradores acessam a plataforma com seus próprios usuários e senhas.</>,
      },
      {
        question: "Como desconectar ou reconectar o WhatsApp?",
        answer: <>Em <strong>Configurações → WhatsApp</strong>, consulte o status da conexão. Para encerrar a sessão, utilize <strong>Desconectar WhatsApp</strong>. Se depois o status estiver <strong>Desconectado</strong>, gere um QR Code e faça a leitura pelo WhatsApp da empresa para conectar novamente.</>,
      },
    ],
  },
  {
    title: "Conversas e atendimento",
    items: [
      {
        question: "Como assumir um atendimento?",
        answer: <>Abra uma conversa disponível e utilize <strong>Assumir atendimento</strong>. Quando a ação é concluída, o usuário que assumiu passa a ser o responsável pelo atendimento. A opção depende do estado da conversa, da existência de responsável e das permissões do usuário.</>,
      },
      {
        question: "Como saber quem é o responsável pelo atendimento?",
        answer: <>As informações do cliente e o <strong>Cliente 360°</strong> mostram o responsável quando houver um atendimento humano atribuído. Quando não houver responsável, a plataforma pode indicar <strong>Sem responsável</strong>.</>,
      },
      {
        question: "Como transferir uma conversa para outro setor?",
        answer: <>Na conversa, utilize <strong>Transferir</strong> e escolha o setor disponível em <strong>Transferir para</strong>. A transferência atual é feita para outro setor e libera o responsável do atendimento. A ação depende da permissão do usuário.</>,
      },
      {
        question: "Como finalizar um atendimento?",
        answer: <>Durante um atendimento humano, utilize <strong>Finalizar</strong>. A finalização encerra o atendimento atual e libera o responsável. O comportamento da IA depois disso depende da configuração definida em <strong>Configurações → Atendimento Humano</strong>.</>,
      },
      {
        question: "Por que não estou vendo determinada conversa?",
        answer: <>A visualização depende das permissões, do setor e da responsabilidade pelo atendimento. Sem acesso global às conversas, o usuário vê atendimentos em estado humano dos setores aos quais está vinculado quando estão sem responsável ou atribuídos ao próprio usuário. Se acredita que deveria visualizar uma conversa, procure o gestor da empresa.</>,
      },
      {
        question: "Por que uma ação de atendimento não aparece para mim?",
        answer: <>As ações disponíveis dependem do estado do atendimento e das permissões do usuário. Por isso, opções como <strong>Assumir atendimento</strong>, <strong>Transferir</strong> e <strong>Finalizar</strong> podem não aparecer em todas as conversas.</>,
      },
    ],
  },
  {
    title: "IA e atendimento humano",
    items: [
      {
        question: "O que acontece quando um atendente assume a conversa?",
        answer: <>Quando um colaborador assume a conversa, o atendimento passa para o fluxo humano, o usuário fica responsável e a IA deixa de seguir o fluxo normal de respostas enquanto o atendimento humano estiver ativo.</>,
      },
      {
        question: "Por que a IA não respondeu?",
        answer: <>Verifique primeiro se a conversa está em atendimento humano. Nesse estado, a IA não segue o fluxo normal de respostas. Verifique também em <strong>Configurações → WhatsApp</strong> se a conexão está ativa. Se a conversa não estiver em atendimento humano, o WhatsApp estiver conectado e o problema continuar, entre em contato com o suporte da M1M.</>,
      },
      {
        question: "Quando a IA volta depois do atendimento humano?",
        answer: <>Isso depende da configuração da empresa em <strong>Configurações → Atendimento Humano</strong>. A empresa define como a IA deve ficar disponível novamente após a finalização do atendimento humano.</>,
      },
      {
        question: "O cliente pode falar com um atendente depois de a IA iniciar o atendimento?",
        answer: <>Sim. A conversa pode seguir para atendimento humano conforme o fluxo da empresa. Quando um colaborador assume o atendimento, a conversa passa para o fluxo humano.</>,
      },
    ],
  },
  {
    title: "Contatos e Cliente 360°",
    items: [
      {
        question: "O que encontro no Cliente 360°?",
        answer: <>O <strong>Cliente 360°</strong> reúne informações do cliente, como dados cadastrais, responsável, situação do atendimento, observações, retornos, comprovantes e histórico. Também oferece acesso à conversa relacionada.</>,
      },
      {
        question: "Como editar o nome ou o código de um cliente?",
        answer: <>Abra o cliente no <strong>Cliente 360°</strong>. Usuários com permissão para editar o CRM podem alterar o nome operacional e o código do cliente. Se os campos estiverem bloqueados, a própria área informa que o usuário não possui permissão para editar o CRM daquele cliente.</>,
      },
      {
        question: "Como registrar uma observação interna sobre o cliente?",
        answer: <>No <strong>Cliente 360°</strong>, utilize <strong>Observações do Cliente</strong> e depois <strong>Salvar observações</strong>. Essa área é destinada a informações internas usadas pela equipe.</>,
      },
      {
        question: "Onde vejo o histórico do cliente?",
        answer: <>No <strong>Cliente 360°</strong>, consulte <strong>Histórico</strong>. A área apresenta a linha do tempo das interações registradas para o cliente.</>,
      },
      {
        question: "Como agendar um retorno para um cliente?",
        answer: <>No <strong>Cliente 360°</strong>, utilize <strong>Agendar retorno</strong>. A área permite informar título, data, horário e responsável pelo retorno.</>,
      },
      {
        question: "Onde vejo os comprovantes de um cliente?",
        answer: <>No <strong>Cliente 360°</strong>, a área <strong>Comprovantes</strong> mostra os comprovantes vinculados ao cliente e permite abrir o comprovante.</>,
      },
    ],
  },
  {
    title: "Agenda Operacional",
    items: [
      {
        question: "Para que serve a Agenda Operacional?",
        answer: <>A <strong>Agenda Operacional</strong> reúne compromissos e retornos da operação. Ela permite acompanhar itens por situação e data e acessar o cliente ou a conversa relacionada.</>,
      },
      {
        question: "Como acompanhar compromissos de hoje, amanhã ou atrasados?",
        answer: <>Na <strong>Agenda Operacional</strong>, utilize os filtros <strong>Hoje</strong>, <strong>Amanhã</strong>, <strong>Atrasadas</strong>, <strong>Por data</strong> ou <strong>Todas</strong>. O <strong>Dashboard Operacional</strong> também mostra a quantidade de compromissos de hoje e de pendências atrasadas.</>,
      },
      {
        question: "Como concluir um compromisso?",
        answer: <>Localize o item na <strong>Agenda Operacional</strong> e utilize a ação de conclusão disponível. A Agenda também oferece acesso ao contato e à conversa relacionados ao compromisso.</>,
      },
    ],
  },
  {
    title: "Financeiro e comprovantes",
    items: [
      {
        question: "Onde aparecem os comprovantes enviados pelos clientes?",
        answer: <>Os comprovantes recebidos podem ser acompanhados em <strong>Financeiro</strong>, na tela <strong>Financeiro Operacional</strong>. Os comprovantes vinculados a um cliente também podem ser consultados no <strong>Cliente 360°</strong>.</>,
      },
      {
        question: "Como funciona o Financeiro Operacional?",
        answer: <>O <strong>Financeiro Operacional</strong> permite pesquisar e acompanhar comprovantes utilizando os filtros <strong>Ativos</strong>, <strong>Recebidos</strong>, <strong>Em análise</strong>, <strong>Aprovados</strong>, <strong>Rejeitados</strong>, <strong>Finalizados</strong> e <strong>Todos</strong>.</>,
      },
      {
        question: "Quais ações existem para um comprovante?",
        answer: <>As ações disponíveis variam conforme o status do comprovante. A tela possui ações como <strong>Visualizar</strong>, <strong>Iniciar análise</strong>, <strong>Aprovar</strong>, <strong>Rejeitar</strong>, <strong>Solicitar novo</strong> e <strong>Finalizar</strong>, além de atalhos para <strong>Cliente 360°</strong> e <strong>Conversa</strong>.</>,
      },
      {
        question: "O que acontece quando solicito um novo comprovante?",
        answer: <>Ao utilizar <strong>Solicitar novo</strong>, o M1M Connect registra a solicitação de um novo comprovante e envia ao cliente a mensagem correspondente pelo WhatsApp.</>,
      },
      {
        question: "Analisar um comprovante envia confirmação automática ao cliente?",
        answer: <>Não. A análise do comprovante, por si só, não envia uma confirmação automática ao cliente. A ação <strong>Solicitar novo</strong> possui um envio específico de mensagem pelo WhatsApp.</>,
      },
      {
        question: "Todo usuário pode acessar e analisar comprovantes?",
        answer: <>Não. O acesso aos comprovantes depende das permissões do usuário. Se a área necessária não estiver disponível, procure o gestor responsável pelos acessos da empresa.</>,
      },
    ],
  },
  {
    title: "Usuários e permissões",
    items: [
      {
        question: "Como cadastrar um colaborador?",
        answer: <>Um usuário com permissão para gerenciar colaboradores pode acessar <strong>Configurações → Usuários e Permissões</strong> e utilizar <strong>Novo usuário</strong>. O novo colaborador não é vinculado automaticamente a um setor.</>,
      },
      {
        question: "Onde encontro o convite de primeiro acesso?",
        answer: <>Em <strong>Configurações → Usuários e Permissões</strong>, o convite fica disponível para o colaborador que ainda não concluiu o primeiro acesso. O link individual é válido por 24 horas, e gerar um novo convite invalida o anterior.</>,
      },
      {
        question: "Como vincular um colaborador a um setor?",
        answer: <>Acesse <strong>Configurações → Setores</strong>, abra o setor desejado e escolha <strong>Responsáveis</strong>. Selecione os colaboradores e utilize <strong>Salvar responsáveis</strong>.</>,
      },
      {
        question: "Como ativar ou inativar um colaborador?",
        answer: <>Em <strong>Configurações → Usuários e Permissões</strong>, localize o colaborador e utilize <strong>Ativar</strong> ou <strong>Inativar</strong>. A inativação bloqueia o acesso sem excluir o cadastro.</>,
      },
      {
        question: "Posso excluir um colaborador?",
        answer: <>Sim, exceto o usuário principal da empresa. Em <strong>Configurações → Usuários e Permissões</strong>, utilize <strong>Excluir</strong> e confirme a ação.</>,
      },
      {
        question: "Por que não consigo acessar determinada função?",
        answer: <>Algumas áreas e ações dependem das permissões atribuídas ao usuário. Se uma função esperada não estiver disponível, procure o gestor responsável pelos acessos e permissões da empresa.</>,
      },
    ],
  },
  {
    title: "Setores",
    items: [
      {
        question: "Como configurar um setor?",
        answer: <>Acesse <strong>Configurações → Setores</strong> e abra o setor desejado. A configuração atual permite ajustar dados e organização, palavras-chave, conhecimento e responsáveis.</>,
      },
      {
        question: "Como definir os responsáveis de um setor?",
        answer: <>Dentro da configuração do setor, abra <strong>Responsáveis</strong>, selecione os colaboradores que poderão atender e assumir conversas naquele setor e utilize <strong>Salvar responsáveis</strong>.</>,
      },
      {
        question: "Para que servem as palavras-chave do setor?",
        answer: <>As <strong>Palavras-chave</strong> são palavras ou expressões usadas para indicar que o cliente deseja tratar de assuntos relacionados a determinado setor e ajudam no roteamento automático.</>,
      },
      {
        question: "O que é o Conhecimento do setor?",
        answer: <>O <strong>Conhecimento do setor</strong> reúne informações específicas daquela área, como assuntos atendidos, informações importantes, produtos ou serviços, perguntas frequentes, prazos, entregas, garantias, regras e orientações.</>,
      },
      {
        question: "Cada setor possui um horário próprio?",
        answer: <>A interface atual utiliza o <strong>Horário Geral</strong> da empresa. Essa configuração é aplicada automaticamente a todos os setores.</>,
      },
    ],
  },
  {
    title: "Configurações",
    items: [
      {
        question: "Onde altero os dados da empresa?",
        answer: <>Acesse <strong>Configurações → Empresa</strong>. Essa área reúne dados institucionais, endereço e canais oficiais da empresa.</>,
      },
      {
        question: "Qual é a diferença entre Empresa e Conhecimento da Empresa?",
        answer: <><strong>Empresa</strong> reúne dados institucionais, endereço e canais oficiais. <strong>Conhecimento da Empresa</strong> é a área destinada às informações essenciais do negócio usadas no contexto da IA.</>,
      },
      {
        question: "Onde configuro os horários de atendimento?",
        answer: <>Acesse <strong>Configurações → Horário Geral</strong>. Nessa área são definidos os dias e horários padrão de atendimento da empresa. A configuração é aplicada automaticamente aos setores.</>,
      },
      {
        question: "Onde configuro a mensagem fora do expediente?",
        answer: <>Acesse <strong>Configurações → Mensagens Automáticas</strong>. Essa área é destinada às mensagens enviadas fora do expediente.</>,
      },
      {
        question: "Onde configuro formas de pagamento e orientações financeiras?",
        answer: <>Acesse <strong>Configurações → Pagamentos</strong>. Essa área reúne formas de pagamento, condições e orientações comerciais usadas no atendimento.</>,
      },
      {
        question: "Onde configuro o comportamento da IA após o atendimento humano?",
        answer: <>Acesse <strong>Configurações → Atendimento Humano</strong>. Nessa área a empresa define o comportamento da IA depois que um colaborador assume a conversa e como ela deve ficar disponível novamente após a finalização. Também existe configuração de mensagem de encerramento.</>,
      },
    ],
  },
  {
    title: "Dashboard e CRM",
    items: [
      {
        question: "Para que serve o Dashboard Operacional?",
        answer: <>O <strong>Dashboard Operacional</strong> mostra uma visão rápida do que precisa de atenção na empresa. Ele apresenta <strong>Agenda de hoje</strong>, <strong>Pendências atrasadas</strong>, <strong>Contatos</strong>, <strong>IA atendendo</strong>, <strong>Atendimento humano</strong> e <strong>Comprovantes ativos</strong>, além dos próximos compromissos do dia.</>,
      },
      {
        question: "O que significam IA atendendo e Atendimento humano no Dashboard?",
        answer: <><strong>IA atendendo</strong> contabiliza os contatos atualmente com status <strong>IA</strong>. <strong>Atendimento humano</strong> contabiliza os contatos atualmente com status <strong>HUMANO</strong>.</>,
      },
      {
        question: "Para que serve o CRM?",
        answer: <>O <strong>CRM</strong> permite pesquisar clientes por informações como nome, telefone, empresa, cidade ou código e consultar dados operacionais do cliente. A partir dele, é possível acessar o <strong>Cliente 360°</strong> e a conversa relacionada.</>,
      },
    ],
  },
];


function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function HelpPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return categories;

    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          normalize(`${category.title} ${item.question}`).includes(term),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [search]);

  return (
    <main className="flex min-h-screen bg-[#f7f7f8] text-[#191919]">
      <Sidebar />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center border-b border-black/5 bg-white px-6 lg:px-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/35">
              Suporte
            </p>
            <h1 className="mt-1 text-xl font-bold">Como podemos ajudar?</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-10">
          <div className="mx-auto max-w-4xl">
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/35">
                <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar uma dúvida..."
                className="h-12 w-full rounded-xl border border-black/10 bg-white pl-12 pr-4 text-sm outline-none transition placeholder:text-black/35 focus:border-black/25"
              />
            </div>

            <div className="mt-6 space-y-6">
              {filtered.map((category) => (
                <section key={category.title}>
                  <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.16em] text-[#0A9090]">
                    {category.title}
                  </h2>
                  <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
                    {category.items.map((item, index) => (
                      <details
                        key={item.question}
                        className={index > 0 ? "group border-t border-black/[0.07]" : "group"}
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-sm font-semibold text-black/75 transition hover:bg-black/[0.02]">
                          <span>{item.question}</span>
                          <span className="text-lg font-normal text-black/35 transition group-open:rotate-45">+</span>
                        </summary>
                        <div className="px-4 pb-4 pr-12 text-sm leading-6 text-black/60">
                          {item.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              ))}

              {filtered.length === 0 && (
                <div className="rounded-xl border border-black/10 bg-white px-5 py-8 text-center text-sm text-black/50">
                  Nenhuma dúvida encontrada para esta pesquisa.
                </div>
              )}
            </div>

            <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
              <div>
                <h2 className="text-base font-bold">Não encontrou o que precisava?</h2>
                <p className="mt-1 text-sm text-black/55">Fale com o suporte da M1M.</p>
                <p className="mt-1 text-sm font-medium text-black/70">WhatsApp de suporte: (65) 99605-1599</p>
              </div>
              <a
                href="https://wa.me/5565996051599?text=Ol%C3%A1%21%20Preciso%20de%20ajuda%20com%20o%20M1M%20Connect."
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/85 sm:mt-0"
              >
                Falar com o suporte
              </a>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

