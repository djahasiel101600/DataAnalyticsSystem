import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { downloadCSV } from '../lib/export-csv'
import { downloadXLSX } from '../lib/export-xlsx'
import { downloadXLSXServer, shouldUseServerXLSX } from '../lib/export-xlsx-server'
import { downloadJSON } from '../lib/export-json'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

interface ExportButtonsProps {
  selectedDatasetId?: string | null
}

export function ExportButtons({ selectedDatasetId }: ExportButtonsProps) {
  const { result, getDataset } = useDatasets()
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dataset = selectedDatasetId ? getDataset(selectedDatasetId) : null
  const exportData = result ?? (dataset ? { columns: dataset.columns, rows: dataset.rows } : null)
  const hasExport = exportData && exportData.rows.length > 0
  const filename = result ? 'result' : (dataset?.name ?? 'export')

  const handleExportCSV = () => {
    if (exportData) {
      setError(null)
      downloadCSV(exportData.columns, exportData.rows, `${filename}.csv`)
    }
  }

  const handleExportXLSX = async () => {
    if (!exportData) return
    setError(null)
    setExporting(true)
    try {
      if (shouldUseServerXLSX(exportData.rows)) {
        await downloadXLSXServer(exportData.columns, exportData.rows, `${filename}.xlsx`)
      } else {
        downloadXLSX(exportData.columns, exportData.rows, `${filename}.xlsx`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleExportJSON = () => {
    if (exportData) {
      setError(null)
      downloadJSON(exportData.columns, exportData.rows, `${filename}.json`)
    }
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-sm font-medium">Export</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {hasExport ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportXLSX} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Excel'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                JSON
              </Button>
            </div>
            {exportData.rows.length > 15000 && (
              <p className="text-xs text-muted-foreground">Excel uses server for large data.</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {dataset ? `Select "Export as CSV/Excel" to export "${dataset.name}".` : 'Select a dataset or run an operation to export.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
