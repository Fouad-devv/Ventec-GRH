"""
GRH-VENTEC FastAPI AI Service — entry point.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import cv_router, filter_router, generation_router, health, posting_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="GRH-VENTEC AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(filter_router.router)
app.include_router(cv_router.router)
app.include_router(posting_router.router)
app.include_router(generation_router.router)
