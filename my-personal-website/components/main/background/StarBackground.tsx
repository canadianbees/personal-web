"use client";

import React, { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import type { Points as PointsType } from "three";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const random = require("maath/random") as { inSphere: (buffer: Float32Array, options: { radius: number }) => Float32Array };

const StarBackground = (props: Record<string, unknown>) => {
  const ref = useRef<PointsType>(null!);
  const [sphere] = useState(() =>
    random.inSphere(new Float32Array(4998), { radius: 1.2 })
  );

  useFrame((_state, delta) => {
    ref.current.rotation.x -= delta/10;
    ref.current.rotation.y -= delta/15;
  })


  return (
    <group rotation={[0,0, Math.PI / 4]}>
        <Points
        ref={ref}
        positions={sphere}
        stride={3}
        frustumCulled
        {...props}
        >
            <PointMaterial
                transparent
                color="#272E27"
                size={0.004}
                sizeAttenuation={true}
                depthWrite={false}
            />
        </Points>
    </group>
  )
};

const StarsCanvas = () => (
    <div className="w-full h-auto fixed inset-0 z-[-1] pointer-events-none">
        <Canvas camera={{position: [0, 0, 1]}}>
        <Suspense fallback={null}>
            <StarBackground />
        </Suspense>
        </Canvas>
    </div>
)

export default StarsCanvas;