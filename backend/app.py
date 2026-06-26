from fastapi import FastAPI
import os
import psycopg2
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
load_dotenv()
app = FastAPI()
DATABASE_URL = os.getenv("DATABASE_URL")
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
def get_connection():
    return psycopg2.connect(DATABASE_URL)
@app.post("/{id}")
def root(id:int):
   try:
        conn = get_connection()
        cur = conn.cursor()
        risk = "Medium"
        confidence = 91
        missing_items = [
                "Structural drawings",
                "Load requirements"
        ]
        cur.execute(
            """
            INSERT INTO analysis_results
            (quote_id, risk, confidence, missing_items)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (
                id,
                risk,
                confidence,
                missing_items,  
            )
        )
        inserted_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return {
            "success": True,
            "analysis_id": inserted_id,
            "quote_id": id,
            "data":{
                "risk":risk,
                "confidence":confidence,
                "missing_items":missing_items
            }
        }



    

    
   except Exception as e:
       print(e)
       return {
        "success": False,
        "message": "Analyzer not available"
       }