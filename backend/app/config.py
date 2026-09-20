from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "SISAF 2.0"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://sisaf:sisaf@localhost:5432/sisaf"
    secret_key: str = "dev-secret-nao-usar-em-producao"
    token_expire_minutes: int = 480
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    allowed_hosts: str = "localhost,127.0.0.1"
    instancia_sufixo: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    class Config:
        env_file = ".env"


settings = Settings()
