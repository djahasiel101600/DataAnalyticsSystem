"""
API views for Data Analytics System.
"""
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json
import openpyxl
from io import BytesIO

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
