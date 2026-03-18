"""
API views for Data Analytics System.
"""
import os
import json
from io import BytesIO

import openpyxl
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

# Max file size for server-side parse (50MB)
PARSE_MAX_SIZE = 50 * 1024 * 1024
# Max rows to return (avoid huge JSON)
PARSE_MAX_ROWS = 500_000


@require_http_methods(["GET"])
def health(request):
    return JsonResponse({"status": "ok"})


@require_http_methods(["POST"])
@csrf_exempt
def parse_upload(request):
    """
    Accept multipart file (key 'file'). Parse CSV or Excel with pandas.
    Return JSON: { "columns": [...], "rows": [{...}, ...] }.
    For very large files we truncate to PARSE_MAX_ROWS.
    """
    if "file" not in request.FILES:
        return JsonResponse({"error": "No file provided"}, status=400)
    upload = request.FILES["file"]
    if upload.size > PARSE_MAX_SIZE:
        return JsonResponse(
            {"error": f"File too large (max {PARSE_MAX_SIZE // (1024*1024)}MB)"},
            status=400,
        )
    name = (upload.name or "").lower()
    try:
        import pandas as pd
    except ImportError:
        return JsonResponse({"error": "pandas not available"}, status=500)
    try:
        if name.endswith(".csv"):
            df = pd.read_csv(upload, dtype=str, on_bad_lines="skip", encoding="utf-8")
        elif name.endswith(".xlsx"):
            df = pd.read_excel(upload, engine="openpyxl", dtype=str)
        else:
            return JsonResponse({"error": "Unsupported format (use .csv or .xlsx for large files)"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
    df = df.fillna("")
    columns = list(df.columns.astype(str))
    if len(df) > PARSE_MAX_ROWS:
        df = df.head(PARSE_MAX_ROWS)
    rows = df.to_dict(orient="records")
    return JsonResponse({"columns": columns, "rows": rows})


@require_http_methods(["POST"])
@csrf_exempt
def export_xlsx(request):
    """Accept JSON body: { "rows": [[...]], "columns": ["col1", ...] }. Return XLSX file."""
    try:
        body = json.loads(request.body)
        rows = body.get("rows", [])
        columns = body.get("columns", [])
        if not columns and rows:
            columns = [str(i) for i in range(len(rows[0]))]
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Export"
        if columns:
            ws.append(columns)
        for row in rows:
            if isinstance(row, (list, tuple)):
                ws.append(list(row))
            elif isinstance(row, dict):
                ws.append([row.get(c, "") for c in columns])
            else:
                ws.append([str(row)])
        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)
        res = HttpResponse(buf.read(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        res["Content-Disposition"] = 'attachment; filename="export.xlsx"'
        return res
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def ai_analytics(request):
    """
    Accept JSON: { "message": "user question", "columns": [...], "sample_rows": [...] }.
    Call OpenAI with a data-analytics system prompt and optional data context.
    Return { "reply": "..." } or { "error": "..." }.
    """
    api_key = getattr(settings, "OPENAI_API_KEY", None) or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return JsonResponse({"error": "OpenAI API key not configured. Set OPENAI_API_KEY."}, status=503)
    try:
        body = json.loads(request.body)
        message = (body.get("message") or "").strip()
        if not message:
            return JsonResponse({"error": "message is required"}, status=400)
        columns = body.get("columns") or []
        sample_rows = body.get("sample_rows") or []
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    system_prompt = """You are a helpful data analytics assistant. The user is working with tabular data in a tool that supports: upload CSV/Excel, duplicate check, lookup, filter & sort, regex search, merge/join, and aggregation (including pivot). Answer concisely. When the user shares column names or sample data, use that context to suggest operations, columns to use, or summarize. If asked to summarize data, describe patterns, types, and suggest next steps. Do not make up column names that were not provided."""

    user_content = message
    if columns or sample_rows:
        context_parts = []
        if columns:
            context_parts.append(f"Columns: {', '.join(columns)}")
        if sample_rows:
            head = sample_rows[:5]
            context_parts.append("Sample rows (first 5):")
            for i, row in enumerate(head):
                context_parts.append(f"  Row {i + 1}: {row}")
        user_content = "Context from the user's current data:\n" + "\n".join(context_parts) + "\n\nUser question: " + message

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            max_tokens=1024,
        )
        reply = (response.choices[0].message.content or "").strip()
        return JsonResponse({"reply": reply})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=502)
