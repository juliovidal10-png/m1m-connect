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
    title: "WhatsApp",
    items: [
      {
        question: "Meu WhatsApp aparece como desconectado. O que faço?",
        answer: <>Acesse <strong>Configurações → WhatsApp</strong> e verifique o status da conexão. Se estiver <strong>Desconectado</strong>, inicie a reconexão e escaneie o QR Code utilizando o WhatsApp da empresa. Aguarde até o status aparecer como <strong>Conectado</strong> antes de testar novamente.</>,
      },
      {
        question: "Preciso escanear o QR Code todos os dias?",
        answer: <>Não. O QR Code é necessário apenas para conectar ou reconectar o WhatsApp da empresa quando a sessão estiver desconectada.</>,
      },
      {
        question: "Os colaboradores precisam escanear QR Code?",
        answer: <>Não. O QR Code é utilizado para conectar o <strong>WhatsApp da empresa</strong>. Os colaboradores acessam o M1M Connect com seus próprios usuários e senhas.</>,
      },
      {
        question: "Troquei de celular ou meu WhatsApp desconectou. O que faço?",
        answer: <>Acesse a configuração do WhatsApp e verifique o status. Se a conexão estiver desativada, realize novamente a leitura do QR Code utilizando o WhatsApp da empresa.</>,
      },
    ],
  },
  {
    title: "Atendimento",
    items: [
      {
        question: "Como assumir uma conversa?",
        answer: <>Abra a conversa disponível e utilize a opção de assumir atendimento. A partir desse momento, o atendimento fica vinculado ao usuário responsável conforme as regras da plataforma.</>,
      },
      {
        question: "Como transferir uma conversa?",
        answer: <>Dentro da conversa, utilize a opção de transferência disponível e escolha o setor ou responsável permitido.</>,
      },
      {
        question: "Como finalizar um atendimento?",
        answer: <>Utilize a ação de finalizar disponível na conversa. Após a finalização, o atendimento deixa de permanecer como conversa ativa do responsável.</>,
      },
      {
        question: "Por que não estou vendo determinada conversa?",
        answer: <>A visualização depende das permissões e dos setores aos quais seu usuário está vinculado. Sem acesso global às conversas, você verá apenas os atendimentos encaminhados aos seus setores. Se acredita que deveria visualizar uma conversa, procure o gestor da sua empresa.</>,
      },
    ],
  },
  {
    title: "IA",
    items: [
      {
        question: "Por que a IA não respondeu?",
        answer: <>Primeiro verifique se o WhatsApp da empresa está conectado. Se a conexão estiver normal e a IA continuar sem responder, entre em contato com o suporte da M1M. Não é necessário alterar nenhuma configuração técnica por conta própria.</>,
      },
      {
        question: "O que acontece quando um atendente assume a conversa?",
        answer: <>Quando um atendimento humano assume a conversa, a IA deixa de atuar conforme as regras configuradas para a empresa.</>,
      },
      {
        question: "Posso falar com um atendente mesmo depois de a IA iniciar o atendimento?",
        answer: <>Sim. Quando necessário, a conversa pode seguir para atendimento humano conforme o fluxo configurado para a empresa.</>,
      },
    ],
  },
  {
    title: "Usuários",
    items: [
      {
        question: "Como cadastrar um colaborador?",
        answer: <>O usuário com permissão de gestão pode acessar <strong>Configurações → Usuários e Permissões</strong> e utilizar <strong>Novo Usuário</strong>. Após o cadastro, o colaborador fica disponível para ser vinculado aos setores da empresa.</>,
      },
      {
        question: "O colaborador precisa usar o WhatsApp pessoal?",
        answer: <>Não. O atendimento é realizado pelo M1M Connect utilizando o WhatsApp conectado da empresa.</>,
      },      {
        question: "Como funciona o primeiro acesso do colaborador?",
        answer: <>Depois do cadastro, o gestor utiliza <strong>Gerar/Copiar convite</strong> para obter o link individual. O colaborador abre esse link, cria a própria senha, ativa a conta e depois acessa normalmente pela tela de login.</>,
      },
      {
        question: "Onde encontro o convite de acesso do colaborador?",
        answer: <>Em <strong>Configurações → Usuários e Permissões</strong>, o botão <strong>Gerar/Copiar convite</strong> aparece enquanto o colaborador ainda está pendente e não concluiu o primeiro acesso.</>,
      },
      {
        question: "Como vincular um colaborador a um setor?",
        answer: <>Acesse <strong>Configurações → Setores</strong>, abra o setor desejado e escolha <strong>Responsáveis</strong>. Selecione o colaborador e salve. Um novo colaborador não é vinculado automaticamente a nenhum setor.</>,
      },
      {
        question: "Como desativar um colaborador?",
        answer: <>Em <strong>Configurações → Usuários e Permissões</strong>, localize o colaborador e utilize <strong>Inativar</strong>. O acesso é bloqueado sem excluir o cadastro.</>,
      },
      {
        question: "Posso excluir um colaborador?",
        answer: <>Sim, exceto o usuário principal da empresa. Em <strong>Configurações → Usuários e Permissões</strong>, utilize <strong>Excluir</strong> e confirme a ação. Use essa opção somente quando realmente quiser remover o cadastro.</>,
      },
      {
        question: "Esqueci minha senha. O que faço?",
        answer: <>Na tela de login, clique em <strong>Esqueci minha senha</strong>, informe o e-mail cadastrado no M1M Connect e selecione <strong>Enviar instruções</strong>. Você receberá por e-mail um link para criar uma nova senha. O link é válido por 60 minutos e pode ser utilizado apenas uma vez. Se o link expirar ou já tiver sido utilizado, solicite um novo.</>,
      },
      {
        question: "Como redefino minha senha?",
        answer: <>Abra o e-mail de recuperação enviado pelo M1M Connect e clique em <strong>Redefinir minha senha</strong>. Crie a nova senha e conclua a alteração. Depois, volte ao login e acesse normalmente com a nova senha.</>,
      },
    ],
  },
  {
    title: "Acesso",
    items: [
      {
        question: "Meu período de teste terminou. O que faço?",
        answer: <>Entre em contato com o suporte da M1M para verificar a continuidade do acesso ao M1M Connect.</>,
      },
      {
        question: "Minha empresa foi reativada, mas o WhatsApp não voltou a funcionar. O que faço?",
        answer: <>Após uma reativação, verifique em <strong>Configurações → WhatsApp</strong> se o status aparece como <strong>Conectado</strong>. Caso apareça como <strong>Desconectado</strong>, realize novamente a conexão utilizando o QR Code. Depois, envie uma mensagem de teste.</>,
      },
      {
        question: "Minha conta aparece como inativa. O que faço?",
        answer: <>Procure o gestor responsável pela sua empresa. Se o problema estiver relacionado ao acesso da própria empresa ao M1M Connect, entre em contato com o suporte da M1M.</>,
      },
    ],
  },
  {
    title: "Comprovantes",
    items: [
      {
        question: "O cliente enviou um comprovante. Onde ele aparece?",
        answer: <>O comprovante recebido aparece no fluxo correspondente ao cliente e nas áreas da plataforma destinadas à análise de comprovantes, conforme as permissões do usuário.</>,
      },
      {
        question: "Todo usuário pode analisar comprovantes?",
        answer: <>Não necessariamente. A visualização e a análise dependem das permissões e do setor configurado para cada usuário.</>,
      },
      {
        question: "O M1M Connect responde automaticamente ao cliente após analisar um comprovante?",
        answer: <>A análise do comprovante, por si só, não envia uma confirmação automática ao cliente. Quando o responsável utiliza a ação para <strong>solicitar um novo comprovante</strong>, o M1M Connect envia ao cliente a mensagem correspondente pelo WhatsApp.</>,
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

