// Recorta a la persona de cada PNG (Vision, macOS 14+) y guarda PNG con transparencia.
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let entrada = URL(fileURLWithPath: args[1]), salida = URL(fileURLWithPath: args[2])
let ctx = CIContext()
let archivos = try FileManager.default.contentsOfDirectory(at: entrada, includingPropertiesForKeys: nil)
  .filter { ["png", "jpg", "webp"].contains($0.pathExtension.lowercased()) }.sorted { $0.path < $1.path }
for f in archivos {
  guard let src = CGImageSourceCreateWithURL(f as CFURL, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { continue }
  let req = VNGenerateForegroundInstanceMaskRequest()
  let h = VNImageRequestHandler(cgImage: img)
  try h.perform([req])
  guard let r = req.results?.first else { print("sin persona: \(f.lastPathComponent)"); continue }
  // solo la figura más grande (la persona): deja fuera la plataforma giratoria
  // u otros objetos que Vision también separa del fondo
  var mayor = r.allInstances.first!, area = -1
  for i in r.allInstances {
    let m = try r.generateMask(forInstances: IndexSet(integer: i))
    CVPixelBufferLockBaseAddress(m, .readOnly)
    let w = CVPixelBufferGetWidth(m), alto = CVPixelBufferGetHeight(m), fila = CVPixelBufferGetBytesPerRow(m)
    let p = CVPixelBufferGetBaseAddress(m)!.assumingMemoryBound(to: Float32.self)
    var n = 0
    for y in stride(from: 0, to: alto, by: 4) { for x in stride(from: 0, to: w, by: 4) where p[y * fila / 4 + x] > 0.5 { n += 1 } }
    CVPixelBufferUnlockBaseAddress(m, .readOnly)
    if n > area { area = n; mayor = i }
  }
  let buf = try r.generateMaskedImage(ofInstances: IndexSet(integer: mayor), from: h, croppedToInstancesExtent: false)
  var ci = CIImage(cvPixelBuffer: buf)
  // con "persona" (3er argumento): además se cruza con la silueta de PERSONA de
  // Vision (un poco ensanchada), así se va la plataforma en la que está parada
  // sin tocar los zapatos aunque sean claros
  if args.count > 3 && args[3] == "persona" {
    let pr = VNGeneratePersonSegmentationRequest()
    pr.qualityLevel = .accurate
    try h.perform([pr])
    if let pm = pr.results?.first?.pixelBuffer {
      var m = CIImage(cvPixelBuffer: pm)
      m = m.transformed(by: CGAffineTransform(scaleX: ci.extent.width / m.extent.width, y: ci.extent.height / m.extent.height))
      m = m.applyingFilter("CIMorphologyMaximum", parameters: ["inputRadius": 5]).cropped(to: ci.extent)
      ci = ci.applyingFilter("CIBlendWithMask", parameters: ["inputBackgroundImage": CIImage.empty().cropped(to: ci.extent), "inputMaskImage": m])
    }
  }
  guard let cg = ctx.createCGImage(ci, from: ci.extent) else { continue }
  let destino = salida.appendingPathComponent(f.deletingPathExtension().lastPathComponent + ".png")
  let d = CGImageDestinationCreateWithURL(destino as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(d, cg, nil); CGImageDestinationFinalize(d)
}
print("listo \(archivos.count)")
