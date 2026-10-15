import SwiftUI

struct AnnaMark: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: 374.666, y: 96.1406))
        p.addLine(to: CGPoint(x: 30.6471, y: 658.222))
        p.addCurve(to: CGPoint(x: 281.881, y: 948.559), control1: CGPoint(x: -72.0646, y: 826.071), control2: CGPoint(x: 101.623, y: 1026.76))
        p.addLine(to: CGPoint(x: 429.61, y: 884.419))
        p.addCurve(to: CGPoint(x: 662.39, y: 884.419), control1: CGPoint(x: 503.895, y: 852.185), control2: CGPoint(x: 588.152, y: 852.185))
        p.addLine(to: CGPoint(x: 810.119, y: 948.559))
        p.addCurve(to: CGPoint(x: 1061.35, y: 658.222), control1: CGPoint(x: 990.377, y: 1026.81), control2: CGPoint(x: 1164.06, y: 826.071))
        p.addLine(to: CGPoint(x: 717.38, y: 96.1406))
        p.addCurve(to: CGPoint(x: 374.666, y: 96.1406), control1: CGPoint(x: 638.949, y: -32.0469), control2: CGPoint(x: 453.098, y: -32.0469))
        p.closeSubpath()
        let scale = min(rect.width / 1092, rect.height / 966)
        return p.applying(CGAffineTransform(scaleX: scale, y: scale)).applying(CGAffineTransform(translationX: rect.midX - 546 * scale, y: rect.midY - 483 * scale))
    }
}

struct VoicePill: View {
    var level: Float
    var body: some View {
        HStack(spacing: 2.5) {
            ForEach(0..<7) { index in
                let taper = 1 - Double(abs(index - 3)) / 3 * 0.7
                Capsule().fill(Color.white.opacity(0.9))
                    .frame(width: 3, height: 2 + min(1, Double(level)) * taper * 18)
            }
        }
        .frame(height: 20).padding(.horizontal, 13).padding(.vertical, 4)
        .background(Color(white: 0.1), in: Capsule())
        .shadow(color: .orange.opacity(0.28), radius: 10)
        .animation(.easeOut(duration: 0.12), value: level)
    }
}
