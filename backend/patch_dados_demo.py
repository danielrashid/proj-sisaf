"""Aplica as melhorias de login (CPF) e permissão de pesquisa ilimitada
no banco de demonstração já populado.

Uso: python patch_dados_demo.py
Requer: migrations aplicadas (alembic upgrade head).
É idempotente: pode ser executado mais de uma vez.
"""

from app.core.security import hash_senha
from app.database import SessionLocal
from app.models.models import Perfil, Usuario, VinculoFuncional, Especialidade, Unidade

SENHA = "sisaf123"

# email -> (cpf, pesquisa_ilimitada)
CPFS = {
    "admin@sisaf.local": ("11144477735", True),
    "sub@sisaf.local": ("22255588846", True),
    "chefe@sisaf.local": ("33366699957", True),
    "diretor@sisaf.local": ("44477700068", True),
    "gerente@sisaf.local": ("55588811179", True),
    "aeu1@sisaf.local": ("66699922280", False),
    "aeu2@sisaf.local": ("77700033391", False),
    "oeu1@sisaf.local": ("88811144402", False),
    "fau1@sisaf.local": ("99922255513", False),
    "atend1@sisaf.local": ("12345678901", False),
}


def main() -> None:
    db = SessionLocal()
    try:
        perfil_atend = db.query(Perfil).filter(Perfil.codigo == "atendimento").first()
        if not perfil_atend:
            perfil_atend = Perfil(
                codigo="atendimento", nome="Atendimento (LGPD)", nivel=1
            )
            db.add(perfil_atend)
            db.flush()
            print("Perfil 'atendimento' criado.")
        else:
            print("Perfil 'atendimento' já existe.")

        for email, (cpf, ilimitada) in CPFS.items():
            user = db.query(Usuario).filter(Usuario.email == email).first()
            if user:
                user.cpf = cpf
                user.pesquisa_ilimitada = ilimitada
                print(f"Atualizado: {email} -> cpf {cpf}, ilimitada={ilimitada}")
            elif email == "atend1@sisaf.local":
                unidade = db.query(Unidade).filter(Unidade.sigla == "SUOP").first()
                especialidade = (
                    db.query(Especialidade).filter(Especialidade.sigla == "AEU").first()
                )
                novo = Usuario(
                    nome="Juliana Atendente",
                    email=email,
                    cpf=cpf,
                    senha_hash=hash_senha(SENHA),
                    perfil_id=perfil_atend.id,
                    pesquisa_ilimitada=ilimitada,
                )
                db.add(novo)
                db.flush()
                if unidade and especialidade:
                    db.add(
                        VinculoFuncional(
                            usuario=novo,
                            unidade_id=unidade.id,
                            especialidade_id=especialidade.id,
                            cargo="Atendimento",
                        )
                    )
                print(f"Criado usuário de atendimento: {email}")

        db.commit()
        print("Patch concluído.")
    finally:
        db.close()


if __name__ == "__main__":
    main()