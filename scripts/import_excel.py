import pandas as pd
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import re

# Load environment variables from .env.local
load_dotenv(dotenv_path='.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

EXCEL_PATH = "../QI Project Masterlist.xlsx"

def clean_name_list(names_str):
    if pd.isna(names_str):
        return []
    # Split by comma or newline and strip whitespace
    names = [n.strip() for n in re.split(r'[,\n]', str(names_str)) if n.strip()]
    return names

def migrate_masterlist():
    print("Reading Excel Masterlist...")
    # Header is on row 3 (index 3 in pandas if skiprows=3? No, header=3)
    df = pd.read_excel(EXCEL_PATH, sheet_name='QI Masterlist', header=4)
    
    # Filter out empty rows (Title is mandatory)
    df = df[df['Title'].notna()]
    
    projects = []
    for _, row in df.iterrows():
        # Map Excel columns to database fields
        project = {
            "status": row['Status'] if row['Status'] in ['Idea', 'Pre-Intervention', 'Intervention Ongoing', 'Sustain the Gains'] else 'Idea',
            "title": row['Title'],
            "category": row['Category'] if not pd.isna(row['Category']) else None,
            "subcategory": row['Subcategory'] if not pd.isna(row['Subcategory']) else None,
            "primary_outcome": row['Primary Outcome'] if not pd.isna(row['Primary Outcome']) else None,
            "pdsa_cycle": row['PDSA Cycle'] if not pd.isna(row['PDSA Cycle']) and str(row['PDSA Cycle']).isdigit() else 0,
            "proponents": clean_name_list(row['Proponents (Leads on Bold)']),
            "faculty": row['Faculty'] if not pd.isna(row['Faculty']) else None,
            "updates_and_barriers": row['Updates and Barriers '] if not pd.isna(row['Updates and Barriers ']) else None,
            "last_updated_date": pd.Timestamp.now().isoformat() # We'll use now for initial import
        }
        projects.append(project)

    print(f"Found {len(projects)} projects. Uploading to Supabase...")
    
    for p in projects:
        try:
            res = supabase.table("projects").insert(p).execute()
            print(f"Inserted: {p['title']}")
        except Exception as e:
            print(f"Error inserting {p['title']}: {e}")

if __name__ == "__main__":
    # Ensure .env.local exists or provide values
    if not url or not key:
        print("Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local")
    else:
        migrate_masterlist()
