import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Como o LOGOS recolhe, usa e protege os teus dados pessoais, e quais são os teus direitos.',
};

const LAST_UPDATED = '2 de junho de 2026';

const { email } = siteConfig.organization;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 space-y-4">
      <h2 className="font-display text-ink text-2xl font-medium tracking-tight">{title}</h2>
      <div className="text-ink/85 space-y-4 font-sans text-base leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <header>
        <h1 className="font-display text-ink text-4xl font-medium sm:text-5xl">
          Política de Privacidade
        </h1>
        <p className="text-muted-foreground mt-4 font-sans text-sm">
          Última atualização: {LAST_UPDATED}
        </p>
      </header>

      <p className="text-ink/85 mt-10 font-sans text-lg leading-relaxed">
        Levamos a tua privacidade a sério. Esta política explica, de forma clara, que dados pessoais
        recolhemos quando usas o LOGOS, para que servem, com quem os partilhamos e que direitos
        tens. Aplica-se a toda a plataforma em {siteConfig.url.replace('https://', '')}.
      </p>

      <Section title="1. Quem é o responsável pelo tratamento">
        <p>
          O responsável pelo tratamento dos teus dados é a{' '}
          <strong className="text-ink font-medium">CCLX - Comunidade Cristã de Lisboa</strong>, que
          disponibiliza o LOGOS como ministério de ensino bíblico.
        </p>
        <p>
          Para qualquer questão sobre os teus dados ou para exercer os teus direitos, escreve para{' '}
          <a href={`mailto:${email}`} className="text-orange hover:text-orange-hover underline">
            {email}
          </a>
          .
        </p>
      </Section>

      <Section title="2. Que dados recolhemos e porquê">
        <p>
          Só recolhemos o necessário para te dar acesso à plataforma e registar o teu percurso de
          estudo:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-ink font-medium">Dados da tua conta Google</strong> - quando
            inicias sessão, a Google partilha connosco o teu nome, endereço de email, foto de perfil
            e um identificador da tua conta. Usamos o LOGIN com Google como única forma de
            autenticação; não criamos nem guardamos palavras-passe.
          </li>
          <li>
            <strong className="text-ink font-medium">Registos de conclusão</strong> - as aulas que
            marcas como concluídas, para que o teu progresso fique guardado entre sessões.
          </li>
          <li>
            <strong className="text-ink font-medium">Dados técnicos de sessão</strong> - cookies
            estritamente necessários para te manter autenticado (ver secção 6).
          </li>
        </ul>
        <p>
          Não recolhemos dados que não precisemos e não usamos os teus dados para publicidade nem
          para criar perfis comerciais.
        </p>
      </Section>

      <Section title="3. Com que fundamento jurídico">
        <p>
          Tratamos os teus dados com base na{' '}
          <strong className="text-ink font-medium">execução do serviço</strong> que pediste: para
          criares conta e acederes aos conteúdos, precisamos de tratar os dados acima. Os registos
          de conclusão assentam no nosso interesse legítimo em oferecer-te uma experiência de estudo
          contínua e coerente.
        </p>
      </Section>

      <Section title="4. Quem tem acesso aos dados">
        <p>
          Não vendemos nem cedemos os teus dados. Recorremos a fornecedores de tecnologia que os
          tratam por nossa conta, apenas para fazer o serviço funcionar:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-ink font-medium">Supabase</strong> - base de dados, autenticação
            e armazenamento dos ficheiros das aulas.
          </li>
          <li>
            <strong className="text-ink font-medium">Vercel</strong> - alojamento da plataforma.
          </li>
          <li>
            <strong className="text-ink font-medium">Google</strong> - autenticação (início de
            sessão).
          </li>
          <li>
            <strong className="text-ink font-medium">Resend</strong> - envio de emails do sistema
            (por exemplo, relacionados com a tua conta).
          </li>
        </ul>
      </Section>

      <Section title="5. Transferências internacionais">
        <p>
          Alguns destes fornecedores estão sediados fora da União Europeia, nomeadamente nos Estados
          Unidos. Quando há transferência de dados para fora do Espaço Económico Europeu, ela é
          coberta pelas salvaguardas legais previstas no RGPD (cláusulas contratuais-tipo da
          Comissão Europeia e, quando aplicável, o EU-US Data Privacy Framework).
        </p>
      </Section>

      <Section title="6. Cookies">
        <p>
          O LOGOS usa apenas cookies{' '}
          <strong className="text-ink font-medium">estritamente necessários</strong> para te manter
          com sessão iniciada de forma segura. Não usamos cookies de publicidade, de redes sociais
          nem de rastreio entre sites.
        </p>
        <p>
          Por serem essenciais ao funcionamento da plataforma, a lei dispensa o pedido de
          consentimento para estes cookies. É por isso que não verás um banner de cookies: não há
          nada a consentir além do que é indispensável para usares o serviço.
        </p>
      </Section>

      <Section title="7. Durante quanto tempo guardamos os dados">
        <p>
          Guardamos os teus dados enquanto a tua conta estiver ativa. Quando apagas a conta, os teus
          dados pessoais e registos associados são eliminados de forma permanente.
        </p>
      </Section>

      <Section title="8. Os teus direitos">
        <p>Em relação aos teus dados pessoais, tens direito a:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>aceder aos dados que temos sobre ti;</li>
          <li>corrigir dados incorretos ou desatualizados;</li>
          <li>apagar a tua conta e os dados associados;</li>
          <li>opor-te a determinados tratamentos ou pedir a portabilidade dos dados.</li>
        </ul>
        <p>
          Podes apagar a tua conta a qualquer momento, sozinho, em{' '}
          <Link href="/perfil" className="text-orange hover:text-orange-hover underline">
            o teu perfil
          </Link>
          . Para os restantes direitos, ou se preferires que tratemos do apagamento por ti, escreve
          para{' '}
          <a href={`mailto:${email}`} className="text-orange hover:text-orange-hover underline">
            {email}
          </a>
          .
        </p>
        <p>
          Se entenderes que os teus dados não estão a ser tratados corretamente, tens ainda o
          direito de apresentar reclamação à autoridade de controlo portuguesa, a{' '}
          <a
            href="https://www.cnpd.pt"
            target="_blank"
            rel="noreferrer"
            className="text-orange hover:text-orange-hover underline"
          >
            Comissão Nacional de Proteção de Dados (CNPD)
          </a>
          .
        </p>
      </Section>

      <Section title="9. Alterações a esta política">
        <p>
          Podemos atualizar esta política sempre que necessário. Quando o fizermos, alteramos a data
          de &ldquo;última atualização&rdquo; no topo desta página. Se a mudança for significativa,
          procuraremos avisar-te de forma adequada.
        </p>
      </Section>
    </article>
  );
}
