import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

DB_PATH = 'telemetry.db'

def init_db():
    if not os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                algorithm TEXT,
                path_found TEXT,
                nodes_explored INTEGER,
                path_cost INTEGER,
                efficiency_score INTEGER
            )
        ''')
        conn.commit()
        conn.close()

init_db()

@app.route('/api/telemetry', methods=['POST'])
def save_telemetry():
    data = request.json
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            INSERT INTO telemetry (algorithm, path_found, nodes_explored, path_cost, efficiency_score)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data.get('algorithm'),
            data.get('pathFound'),
            data.get('nodesExplored'),
            data.get('pathCost'),
            data.get('efficiencyScore')
        ))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Telemetry logged."}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/telemetry', methods=['GET'])
def get_telemetry():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT 50')
        rows = c.fetchall()
        conn.close()
        
        logs = []
        for row in rows:
            logs.append({
                "id": row[0],
                "timestamp": row[1],
                "algorithm": row[2],
                "pathFound": row[3],
                "nodesExplored": row[4],
                "pathCost": row[5],
                "efficiencyScore": row[6]
            })
        return jsonify(logs), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
