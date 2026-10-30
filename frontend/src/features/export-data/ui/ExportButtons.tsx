import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { downloadCSV } from '../lib/export-csv'
import { downloadXLSX } from '../lib/export-xlsx'
import { downloadXLSXServer, shouldUseServerXLSX } from '../lib/export-xlsx-server'
import { downloadJSON } from '../lib/export-json'
import { Button } from '@/shared/ui/button'

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

  return hasExport ? (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={handleExportCSV}>
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={handleExportXLSX}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Excel'}
        </Button>
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={handleExportJSON}>
          JSON
        </Button>
      </div>
      {exportData.rows.length > 15000 && (
        <p className="text-[11px] text-muted-foreground">Excel uses server for large data.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  ) : (
    <p className="text-[11px] leading-snug text-muted-foreground">
      {dataset ? `Ready to export ${dataset.name}.` : 'Select a dataset or run an operation to export.'}
    </p>
  )
}
