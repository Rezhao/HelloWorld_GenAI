export async function prepareImage(file: File) {
  const image = new Image()
  const objectUrl = URL.createObjectURL(file)

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('The selected image could not be read.'))
      image.src = objectUrl
    })

    const maxDimension = 1600
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)

    const compressed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    })

    if (!compressed || compressed.size >= file.size) return file
    return new File([compressed], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

