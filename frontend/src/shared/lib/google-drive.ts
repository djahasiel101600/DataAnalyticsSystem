export type GoogleDrivePickResult = {
  fileId: string
  name: string
  mimeType?: string
}

export type GoogleDrivePickWithTokenResult = GoogleDrivePickResult & {
  accessToken: string
}

declare global {
  interface Window {
    google?: any
    gapi?: any
  }
}

function waitFor(predicate: () => boolean, timeoutMs = 15000): Promise<void> {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (predicate()) return resolve()
      if (Date.now() - start > timeoutMs) return reject(new Error('Google API failed to load'))
      setTimeout(tick, 50)
    }
    tick()
  })
}

async function ensureGapiLoaded(): Promise<void> {
  await waitFor(() => !!window.gapi && typeof window.gapi.load === 'function')
  await new Promise<void>((resolve) => window.gapi.load('picker', { callback: resolve }))
  await waitFor(() => !!window.google?.picker?.PickerBuilder)
}

function getEnv(name: string): string {
  const v = (import.meta as any).env?.[name]
  return typeof v === 'string' ? v : ''
}

export async function pickFromGoogleDrive(): Promise<GoogleDrivePickWithTokenResult> {
  const apiKey = getEnv('VITE_GOOGLE_API_KEY')
  const appId = getEnv('VITE_GOOGLE_APP_ID')
  if (!apiKey) throw new Error('Missing VITE_GOOGLE_API_KEY')
  if (!appId) throw new Error('Missing VITE_GOOGLE_APP_ID')

  const token = await getGoogleAccessToken()

  await ensureGapiLoaded()

  const picker = new window.google.picker.PickerBuilder()
    .setAppId(appId)
    .setDeveloperKey(apiKey)
    .setOAuthToken(token)
    .addView(
      new window.google.picker.DocsView()
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)
    )
    // callback is set below when building

  const res = await new Promise<GoogleDrivePickResult>((resolve, reject) => {
    const cb = (data: any) => {
      const action = data?.[window.google.picker.Response.ACTION]
      if (action === window.google.picker.Action.CANCEL) {
        reject(new Error('Picker cancelled'))
        return
      }
      if (action !== window.google.picker.Action.PICKED) return
      const doc = data?.[window.google.picker.Response.DOCUMENTS]?.[0]
      if (!doc) {
        reject(new Error('No file selected'))
        return
      }
      resolve({
        fileId: doc[window.google.picker.Document.ID],
        name: doc[window.google.picker.Document.NAME],
        mimeType: doc[window.google.picker.Document.MIME_TYPE],
      })
    }
    const built = picker.setCallback(cb).build()
    built.setVisible(true)
  })

  return { ...res, accessToken: token }
}

export async function getGoogleAccessToken(): Promise<string> {
  await waitFor(() => typeof (window as any).google !== 'undefined' && (window as any).google?.accounts?.oauth2)
  const clientId = getEnv('VITE_GOOGLE_CLIENT_ID')
  if (!clientId) throw new Error('Missing VITE_GOOGLE_CLIENT_ID')
  return await new Promise<string>((resolve, reject) => {
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (resp: any) => {
        if (resp?.access_token) resolve(resp.access_token)
        else reject(new Error('Failed to get access token'))
      },
      error_callback: () => reject(new Error('OAuth popup was closed or blocked')),
    })
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

export async function downloadDriveFileAsBlob(params: {
  fileId: string
  accessToken: string
  mimeType?: string
  name?: string
}): Promise<{ blob: Blob; filename: string }> {
  const { fileId, accessToken, mimeType, name } = params

  // Google Sheets -> export to CSV by default
  const isSheets = mimeType === 'application/vnd.google-apps.spreadsheet'
  const url = isSheets
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/csv`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || res.statusText)
  }
  const blob = await res.blob()

  const filename = isSheets
    ? `${name || fileId}.csv`
    : (name || fileId)

  return { blob, filename }
}

