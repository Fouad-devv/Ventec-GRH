from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str = ""
    backend_url: str
    groq_model_fast: str = "llama-3.1-8b-instant"
    groq_model_smart: str = "llama-3.3-70b-versatile"

    class Config:
        env_file = "../.env"
        extra = "ignore"


settings = Settings()
