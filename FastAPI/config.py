from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    backend_url: str = "http://backend:5000/api"
    model_name: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"


settings = Settings()
