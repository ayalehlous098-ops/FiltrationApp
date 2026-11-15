
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI(
    title="Simulation du procédé de concentration du jus",
    version="1.0"
)

app.mount("/static", StaticFiles(directory="static"), name="static")


class DonneesSimulation(BaseModel):
    m0: float
    x0: float
    residus: float
    mR: float
    xR: float
    T2: float
    T3: float
    Cp: float
    x4: float
    lambda_v: float
    T4: float
    T5: float


@app.get("/")
def accueil():
    return FileResponse("static/index.html")


@app.post("/api/simulation")
def simulation(d: DonneesSimulation):

    # Vérification des données
    if d.m0 <= 0 or d.mR < 0:
        raise HTTPException(status_code=400, detail="Débits invalides")

    if not (0 < d.x0 <= 100 and 0 < d.xR <= 100 and 0 < d.x4 <= 100):
        raise HTTPException(status_code=400, detail="Concentrations invalides")

    if d.residus < 0 or d.residus >= d.m0:
        raise HTTPException(status_code=400, detail="Résidus invalides")

    if d.Cp <= 0 or d.lambda_v <= 0:
        raise HTTPException(status_code=400, detail="Propriétés thermiques invalides")

    if d.T3 < d.T2 or d.T4 < d.T5:
        raise HTTPException(status_code=400, detail="Températures invalides")

    # 1. Filtration
    m1 = d.m0 - d.residus
    x1 = (d.m0 * d.x0) / m1

    # 2. Mélange
    m2 = m1 + d.mR
    x2 = (m1 * x1 + d.mR * d.xR) / m2

    # 3. Chauffage
    Q3 = (m2 * d.Cp * (d.T3 - d.T2)) / 3600

    # 4. Évaporation
    m4 = (m2 * x2) / d.x4
    mv = m2 - m4
    Q4 = (mv * d.lambda_v) / 3600

    # 5. Refroidissement
    Q5 = (m4 * d.Cp * (d.T4 - d.T5)) / 3600

    return {
        "m1": round(m1, 2),
        "x1": round(x1, 2),
        "m2": round(m2, 2),
        "x2": round(x2, 2),
        "Q3": round(Q3, 2),
        "m4": round(m4, 2),
        "mv": round(mv, 2),
        "Q4": round(Q4, 2),
        "Q5": round(Q5, 2)
    }
