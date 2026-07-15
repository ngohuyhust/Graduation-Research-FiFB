# Dong bo tai lieu va ma nguon phuc vu graduation research.
Write-Host "Syncing GR documents from Google Drive..."

rclone sync "GraduationResearch:GR" "../Document" `
  --drive-export-formats txt `
  --progress

Write-Host "Done. GR documents synced to GR"