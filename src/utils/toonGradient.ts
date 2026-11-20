import * as THREE from 'three';

let sharedToonGradient: THREE.DataTexture | null = null;

/**
 * Creates a crisp 4-band cel-shading gradient DataTexture for MeshToonMaterial.
 * Uses RGBAFormat + NearestFilter for maximum WebGL compatibility.
 */
export function getToonGradientTexture(): THREE.DataTexture {
  if (sharedToonGradient) {
    return sharedToonGradient;
  }

  const levels = [95, 165, 220, 255];
  const data = new Uint8Array(levels.length * 4);

  levels.forEach((value, idx) => {
    const offset = idx * 4;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  });

  const texture = new THREE.DataTexture(data, levels.length, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  sharedToonGradient = texture;
  return texture;
}

export function disposeSharedToonGradient(): void {
  if (sharedToonGradient) {
    sharedToonGradient.dispose();
    sharedToonGradient = null;
  }
}
