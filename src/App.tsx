import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls } from "@react-three/drei";
import React, { useEffect, useState } from "react";
import { Physics, Triplet, useBox, useSphere } from "@react-three/cannon";
import * as THREE from "three";
import { Pane } from "tweakpane"; // Import Tweakpane
import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import EarthMap from "./assets/earth_map.jpg";
// Add import for coordinate util
import { convertGeoToCartesian } from "./coordinateUtil"; // Adjust path as needed

const norm = (v: Triplet) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

const Earth = () => {
  const [ref, api] = useSphere(() => ({
    mass: 5.9722e24, // Scaled down mass of Earth
    position: [0, 0, 0],
    args: [6.371], // Scaled radius of Earth (6,371 km -> 6.371 units)
    type: "Static",
  }));

  // Load the Earth texture
  const earthTexture = useLoader(TextureLoader, EarthMap);

  // Use group to apply rotation to the mesh
  return (
    <group rotation={[0, Math.PI, 0]}>
      <mesh castShadow receiveShadow ref={ref}>
        <sphereGeometry args={[6.371, 32, 32]} />
        <meshStandardMaterial map={earthTexture} opacity={1} />
      </mesh>
    </group>
  );
};

const Moon = () => {
  const [ref, api] = useSphere(() => ({
    mass: 7.34767309e22, // Scaled down mass of Moon
    position: [384.4 + 6.371, 0, 0], // Scaled Earth-Moon distance (384,400 km -> 384.4 units)
    velocity: [0, 1.022, 0], // Scaled orbital velocity (1.022 km/s -> 1.022 units/s)
    args: [1.737], // Scaled radius of Moon (1,737 km -> 1.737 units)
  }));

  const [positionVector, setPositionVector] = React.useState<Triplet>([
    0, 0, 0,
  ]);
  const [velocityVector, setVelocityVector] = React.useState<Triplet>([
    0, 0, 0,
  ]);

  const vec = new THREE.Vector3();

  useEffect(() => {
    api.position.subscribe((v) => setPositionVector(v));
    api.velocity.subscribe((v) => setVelocityVector(v));
  }, []);

  useFrame(() => {
    const position = ref.current?.position;
    if (position) {
      const distance = position.length();
      const gravityForce = new THREE.Vector3()
        .copy(position)
        .normalize()
        .multiplyScalar(
          (-6.6743e-11 * (5.9722e24 / 1e24) * (7.34767309e22 / 1e22)) /
            (distance * distance)
        ); // Scaled gravitational force
      api.applyForce(gravityForce.toArray(), [0, 0, 0]);
    }
  });

  return (
    <>
      <mesh castShadow receiveShadow ref={ref} rotation={[0, Math.PI, 0]}>
        <sphereGeometry args={[1.737, 128, 128]} />
        <meshStandardMaterial
          color="blue"
          roughness={0}
          envMapIntensity={0.2}
          emissive="#370037"
        />
      </mesh>
      {/* Velocity vector */}
      <arrowHelper
        args={[
          new THREE.Vector3(
            velocityVector[0],
            velocityVector[1],
            velocityVector[2]
          ).normalize(),
          new THREE.Vector3(
            positionVector[0],
            positionVector[1],
            positionVector[2]
          ),
          norm(velocityVector) * 2,
          "red",
        ]}
      />
      {/* Position vector */}
      <arrowHelper
        args={[
          new THREE.Vector3(
            positionVector[0],
            positionVector[1],
            positionVector[2]
          )
            .negate()
            .normalize(),
          new THREE.Vector3(
            positionVector[0],
            positionVector[1],
            positionVector[2]
          ),
          2,
          "red",
        ]}
      />
    </>
  );
};

const Box = ({
  thrusterStrength,
  leftThrusterStrength,
  rightThrusterStrength,
  size,
  mass,
  thrust,
}: {
  thrusterStrength: number;
  leftThrusterStrength: number;
  rightThrusterStrength: number;
  size: [number, number, number];
  mass: number;
  thrust: number;
}) => {
  // Use Kennedy Space Center coordinates
  const KSC_LAT = 28.5721;
  const KSC_LON = -80.648;
  const KSC_ALT = 0;
  const EARTH_RADIUS = 6.371; // Scaled radius

  const initialPosition = convertGeoToCartesian(
    KSC_LAT,
    KSC_LON,
    KSC_ALT,
    EARTH_RADIUS
  );

  // Compute the "up" vector (surface normal) at the initial position
  const up = new THREE.Vector3(...initialPosition).normalize();

  // --- New Orientation Calculation ---
  // Define a desired local forward direction (e.g., pointing towards North pole initially)
  // This is arbitrary, choose what makes sense for your 'front'
  const approxForward = new THREE.Vector3(0, 1, 0); // Example: Pointing towards geographic North Pole initially

  // Calculate the right vector (orthogonal to up and forward)
  const right = new THREE.Vector3().crossVectors(up, approxForward).normalize();
  // If up and approxForward are parallel (e.g., at the pole), pick a default right
  if (right.lengthSq() < 1e-6) {
    right.set(1, 0, 0); // Default to global X if at pole
  }

  // Recalculate the forward vector to be truly orthogonal to up and right
  const forward = new THREE.Vector3().crossVectors(right, up).normalize();

  // Create rotation matrix from the basis vectors
  const rotationMatrix = new THREE.Matrix4().makeBasis(right, up, forward);

  // Create quaternion from the rotation matrix
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(
    rotationMatrix
  );
  // --- End New Orientation Calculation ---

  // Calculate offset so the box sits slightly above the Earth's surface
  const boxHeight = size[1];
  const surfaceOffset = 0.01; // Add a small buffer distance
  const adjustedPosition: Triplet = [
    initialPosition[0] + up.x * (boxHeight / 2 + surfaceOffset),
    initialPosition[1] + up.y * (boxHeight / 2 + surfaceOffset),
    initialPosition[2] + up.z * (boxHeight / 2 + surfaceOffset),
  ];

  // Use the calculated quaternion for the physics body's initial orientation
  const [ref, api] = useBox<THREE.Mesh>(() => ({
    mass,
    position: adjustedPosition,
    args: [size[0] / 2, size[1] / 2, size[2] / 2],
    quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
  }));

  const [positionVector, setPositionVector] = React.useState<Triplet>([
    0, 0, 0,
  ]);
  const [velocityVector, setVelocityVector] = React.useState<Triplet>([
    0, 0, 0,
  ]);

  useEffect(() => {
    api.position.subscribe((v) => setPositionVector(v));
    api.velocity.subscribe((v) => setVelocityVector(v));
  }, []);

  useFrame(() => {
    // Scale the input [-1, 1] to [-thrust, thrust]
    api.applyForce([0, thrusterStrength * thrust, 0], [0, 0, 0]);
    api.applyForce([leftThrusterStrength * thrust, 0, 0], [0, 0, 0]);
    api.applyForce([rightThrusterStrength * thrust, 0, 0], [0, 0, 0]);

    const position = ref.current?.position;
    if (position) {
      const scaledGravity = 9.8 * (1 / 6.371);
      const gravityForce = new THREE.Vector3()
        .copy(position)
        .normalize()
        .multiplyScalar(-scaledGravity);
      api.applyForce(gravityForce.toArray(), [0, 0, 0]);
    }
  });

  return (
    <>
      <mesh
        castShadow
        receiveShadow
        ref={ref}
        quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial color="green" />
      </mesh>
      {/* Velocity vector */}
      <arrowHelper
        args={[
          new THREE.Vector3(
            velocityVector[0],
            velocityVector[1],
            velocityVector[2]
          ).normalize(),
          new THREE.Vector3(
            positionVector[0],
            positionVector[1],
            positionVector[2]
          ),
          norm(velocityVector) * 2,
          "blue",
        ]}
      />
      {/* Position vector */}
      <arrowHelper
        args={[
          new THREE.Vector3(
            positionVector[0],
            positionVector[1],
            positionVector[2]
          )
            .negate()
            .normalize(),
          new THREE.Vector3(
            positionVector[0],
            positionVector[1],
            positionVector[2]
          ),
          2,
          "blue",
        ]}
      />
    </>
  );
};

const App = () => {
  const [mounted, setMounted] = useState(false);
  const [params, setParams] = useState<{
    mass: number;
    velocityY: number;
    positionX: number;
    radius: number;
    ambient: number;
    directionalLight: number;
    thrusterStrength: number;
    leftThrusterStrength: number;
    rightThrusterStrength: number;
    boxSize: keyof typeof boxSizes;
  }>({
    mass: 7.34767309e22,
    velocityY: 36.83,
    positionX: 360 + 6.371,
    radius: 1.737,
    ambient: 2,
    directionalLight: 5,
    thrusterStrength: 0,
    leftThrusterStrength: 0,
    rightThrusterStrength: 0,
    boxSize: "SATURNV",
  });

  const SCALE = 0.001;

  const boxSizes: Record<string, [number, number, number]> = {
    LM: [9.5 * SCALE, 7 * SCALE, 9.5 * SCALE], // Lunar Module (width x height x depth - approximating overall extents)
    CSM: [3.9 * SCALE, 11.0 * SCALE, 3.9 * SCALE], // Command and Service Module (diameter x length x diameter - as a cylinder approximation)
    CSMlm: [9.5 * SCALE, 15.0 * SCALE, 9.5 * SCALE], // CSM + LM docked (approximate width/depth of LM x combined height x approximate width/depth of LM)
    SATURNV: [10.1 * SCALE, 111.0 * SCALE, 10.1 * SCALE], // Saturn V rocket (diameter x height x diameter)
    CM: [3.9 * SCALE, 3.65 * SCALE, 3.9 * SCALE], // Command Module only (diameter x height x diameter)
  };

  // Realistic (scaled) masses for each box type (in kg, scaled down by 1e4 for simulation)
  const boxMasses: Record<string, number> = {
    SATURNV: 2970000, // Saturn V launch mass ~2,970,000 kg
    CSMlm: 28800 + 15100, // CSM (~28800 kg) + LM (~15100 kg)
    LM: 15100, // LM ~15,100 kg
    CSM: 28800, // CSM ~28,800 kg (CM + SM)
    CM: 5560, // CM ~5,560 kg
  };

  // Realistic (scaled) thrust for each box type (in N, scaled down by 1e4 for simulation)
  const boxThrusts: Record<string, number> = {
    SATURNV: 35100000 / 1e4, // Saturn V F-1 engines (total) ~35,100,000 N
    CSMlm: 91120 / 1e4, // CSM Service Propulsion System ~91,120 N
    LM: 4500 / 1e4, // LM Descent Engine ~4,500 N
    CSM: 91120 / 1e4, // CSM Service Propulsion System ~91,120 N
    CM: 9800 / 1e4, // CM RCS (approximate, ~9,800 N total for all jets)
  };

  useEffect(() => {
    setMounted(true);

    const pane = new Pane();
    pane
      .addBinding(params, "ambient", { min: 0, max: 3 })
      .on("change", (ev) =>
        setParams((prev) => ({ ...prev, ambient: ev.value }))
      );
    pane
      .addBinding(params, "directionalLight", { min: 0, max: 10 })
      .on("change", (ev) =>
        setParams((prev) => ({ ...prev, directionalLight: ev.value }))
      );
    pane
      .addBinding(params, "thrusterStrength", {
        min: -1,
        max: 1,
        step: 0.01,
        label: "Main Thruster",
      })
      .on("change", (ev) =>
        setParams((prev) => ({ ...prev, thrusterStrength: ev.value }))
      );
    pane
      .addBinding(params, "leftThrusterStrength", {
        min: -1,
        max: 1,
        step: 0.01,
        label: "Left Thruster",
      })
      .on("change", (ev) =>
        setParams((prev) => ({ ...prev, leftThrusterStrength: ev.value }))
      );
    pane
      .addBinding(params, "rightThrusterStrength", {
        min: -1,
        max: 1,
        step: 0.01,
        label: "Right Thruster",
      })
      .on("change", (ev) =>
        setParams((prev) => ({ ...prev, rightThrusterStrength: ev.value }))
      );
    pane
      .addBinding(params, "boxSize", {
        options: {
          LM: "LM",
          CSM: "CSM",
          CSMlm: "CSMlm",
          SATURNV: "SATURNV",
          CM: "CM", // Add CM to options
        },
      })
      .on("change", (ev) =>
        setParams((prev) => ({ ...prev, boxSize: ev.value }))
      );

    return () => pane.dispose();
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas dpr={Math.min(window.devicePixelRatio, 2)} shadows linear>
        <React.Suspense fallback={null}>
          <OrbitControls
            attach="orbitControls"
            maxDistance={100000}
            minDistance={0.01}
          />
          <PerspectiveCamera
            makeDefault
            position={[0, 0, 10]}
            fov={75}
            near={0.01}
            far={1000000}
          />
          <color attach="background" args={["#EBECF2"]} />
          <ambientLight intensity={params.ambient} />
          <directionalLight
            intensity={params.directionalLight}
            position={[-10, -10, 0]}
            color="white"
            castShadow
            shadow-mapSize={[4096, 4096]}
          />
          <Physics gravity={[0, 0, 0]} stepSize={1 / 60}>
            <Moon />
            <Earth />
            <Box
              thrusterStrength={params.thrusterStrength}
              leftThrusterStrength={params.leftThrusterStrength}
              rightThrusterStrength={params.rightThrusterStrength}
              size={boxSizes[params.boxSize]}
              mass={boxMasses[params.boxSize]}
              thrust={boxThrusts[params.boxSize]}
            />
          </Physics>
          <axesHelper args={[10]} />
          <gridHelper args={[40, 100]} rotation={[-Math.PI / 2, 0, 0]} />
          <gridHelper args={[40, 100]} rotation={[0, -Math.PI / 2, 0]} />
        </React.Suspense>
      </Canvas>
    </div>
  );
};

export default App;
