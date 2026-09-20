import { Link } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { usePageTitle } from "../lib/usePageTitle";

const SECOES = [
  {
    titulo: "1. Do sistema e das finalidades",
    texto:
      "O SISAF (Sistema Integrado de Ações Fiscais) é ferramenta de uso interno da estrutura de fiscalização, destinada ao registro, à tramitação e ao acompanhamento de ações fiscais. O tratamento de dados pessoais ocorre estritamente para as finalidades institucionais de fiscalização, de acordo com a Lei Federal nº 13.709/2018 (LGPD) e a legislação de regência.",
  },
  {
    titulo: "2. Dados pessoais tratados",
    texto:
      "O sistema trata dados de cidadãos e de estabelecimentos no contexto de procedimentos fiscais (com destaque para informações de identificação como CPF e CNPJ, endereços e demais dados constantes de documentos fiscais), bem como dados funcionais dos servidores que o utilizam (nome, CPF, e-mail e vínculo institucional).",
  },
  {
    titulo: "3. Bases legais",
    texto:
      "O tratamento tem por base legal o cumprimento de obrigação legal ou regulatória, o exercício regular de direitos em processo e o interesse público no exercício das atribuições institucionais, nos termos dos incisos II, IV e VI do art. 7º da LGPD.",
  },
  {
    titulo: "4. Minimização e proteção",
    texto:
      "A pesquisa pelo sistema adota medida de minimização (LGPD): dados de CPF/CNPJ e endereços são apresentados de forma mascarada para os usuários sem autorização de pesquisa ilimitada, concedida individualmente a chefias. Toda consulta é registrada e vinculada ao responsável, para fins de auditoria e responsabilização.",
  },
  {
    titulo: "5. Log de auditoria e retenção",
    texto:
      "As operações realizadas no sistema são registradas em log de auditoria imutável, com identificação do usuário, data, hora e ação executada. Os registros são conservados pelo período necessário ao cumprimento das finalidades institucionais e da legislação aplicável à gestão documental.",
  },
  {
    titulo: "6. Segurança da informação",
    texto:
      "O acesso é autenticado por CPF e senha funcionais, com bloqueio de conta após tentativas inválidas e registro das tentativas de login. A comunicação com o sistema é protegida e as permissões de acesso são segregadas por perfil institucional e vínculo com unidade e especialidade.",
  },
  {
    titulo: "7. Direitos dos titulares",
    texto:
      "O titular de dados pessoais tratados no sistema pode solicitar o acesso, a correção e o esclarecimento quanto ao tratamento, na forma da legislação aplicável, encaminhando requerimento ao encarregado de proteção de dados do órgão.",
  },
  {
    titulo: "8. Compartilhamento",
    texto:
      "Os dados tratados no SISAF não são comercializados nem compartilhados fora da finalidade institucional, salvo em decorrência de obrigação legal ou de procedimentos legítimos entre órgãos públicos no exercício de suas atribuições.",
  },
];

export default function Privacidade() {
  usePageTitle("Política de Privacidade");

  return (
    <div className="min-h-screen bg-[#eef0f7]">
      <div className="bg-gradient-to-br from-[#122e66] via-[#0c2049] to-[#071530]">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-10 sm:px-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <ShieldCheck size={28} className="text-gold" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-white">Política de Privacidade</p>
            <p className="mt-1 text-sm text-blue-100/90">
              SISAF 2.0 · Sistema Integrado de Ações Fiscais · DF Legal
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {SECOES.map((s) => (
            <div
              key={s.titulo}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <h2 className="flex items-center gap-2 text-base font-semibold text-brand-800">
                <FileText size={17} className="shrink-0 text-gold-dark" />
                {s.titulo}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.texto}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 rounded-2xl bg-white p-5 text-xs leading-relaxed text-slate-500 shadow-sm ring-1 ring-slate-200">
          Última atualização: <span className="font-medium text-slate-700">setembro de 2026</span>.
          Esta política pode ser revisada para refletir alterações no sistema ou na legislação
          aplicável.
        </p>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 active:scale-[0.98]"
          >
            <ArrowLeft size={16} /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}