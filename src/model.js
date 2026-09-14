// Head-local coordinates: forward, right, height. The camera looks from +Y.
export function headFeatures(angle, player = false) {
  const co = Math.cos(angle), si = Math.sin(angle);
  const width = player ? 17 : 18, depth = player ? 16 : 17;
  const z = player ? 40 : 36, height = player ? 17 : 18;
  const project = (forward, right, up) => [
    (5 + forward) * co - right * si,
    5 * si + (forward * si + right * co) * .68 - up
  ];
  const patch = (u0, u1, z0, z1) => [
    project(depth / 2, u0, z0), project(depth / 2, u1, z0),
    project(depth / 2, u1, z1), project(depth / 2, u0, z1)
  ];
  const frontVisible = si > .025;
  return {
    width, depth, z, height, frontVisible,
    face: patch(-width / 2, width / 2, z, z + height),
    eyes: frontVisible ? [-4, 4].map(u => patch(u - 1.7, u + 1.7, z + 9, z + 13)) : [],
    mouth: frontVisible ? patch(-4, 4, z + 4, z + 6) : [],
    // Each horn's square root is embedded in the head's top plane, not in screen space.
    horns: [-1, 1].map(side => {
      const base = [[-3, side * 6 - 1.8], [1, side * 6 - 1.8],
                    [1, side * 6 + 1.8], [-3, side * 6 + 1.8]];
      return {base: base.map(([f,u]) => project(f, u, z + height)),
              tip: project(-3, side * 10, z + height + 18)};
    })
  };
}
