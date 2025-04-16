import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls } from "@react-three/drei";
import React, { useEffect, useState } from "react";
import { Physics, Triplet, useSphere } from "@react-three/cannon";
import * as THREE from "three";
import { Pane } from "tweakpane"; // Import Tweakpane

const norm = (v: Triplet) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

const Earth = () => {
  const [ref, api] = useSphere(() => ({
    mass: 5.9722e24 / 1e24, // Scaled down mass of Earth
    position: [0, 0, 0],
    args: [6.371], // Scaled radius of Earth (6,371 km -> 6.371 units)
    type: "Static",
  }));

  return (
    <mesh castShadow receiveShadow ref={ref}>
      <sphereGeometry args={[6.371, 32, 32]} />
      <meshStandardMaterial color="orange" opacity={1} />
    </mesh>
  );
};

const Moon = () => {
  const [ref, api] = useSphere(() => ({
    mass: 7.34767309e22 / 1e22, // Scaled down mass of Moon
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
      <mesh castShadow receiveShadow ref={ref}>
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
}: {
  thrusterStrength: number;
  leftThrusterStrength: number;
  rightThrusterStrength: number;
  size: [number, number, number];
}) => {
  const [ref, api] = useSphere(() => ({
    mass: 2800000,
    position: [
      6.9 *
        Math.cos(28.5721 * (Math.PI / 180)) *
        Math.cos(-80.648 * (Math.PI / 180)), // X
      6.9 * Math.sin(28.5721 * (Math.PI / 180)), // Y
      6.9 *
        Math.cos(28.5721 * (Math.PI / 180)) *
        Math.sin(-80.648 * (Math.PI / 180)), // Z
    ],
    args: [0.5], // Sphere size for physics
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
    api.applyForce([0, thrusterStrength, 0], [0, 0, 0]);
    api.applyForce([leftThrusterStrength, 0, 0], [0, 0, 0]);
    api.applyForce([rightThrusterStrength, 0, 0], [0, 0, 0]);

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
      <mesh castShadow receiveShadow ref={ref}>
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
          norm(velocityVector) * 4,
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
      {/* Left thruster vector */}
      <arrowHelper
        args={[
          new THREE.Vector3(leftThrusterStrength, 0, 0).normalize(),
          new THREE.Vector3(
            positionVector[0],
            positionVector[1],
            positionVector[2]
          ),
          Math.abs(leftThrusterStrength) * 0.001,
          "yellow",
        ]}
      />
      {/* Right thruster vector */}
      <arrowHelper
        args={[
          new THREE.Vector3(rightThrusterStrength, 0, 0).normalize(),
          new THREE.Vector3(
            positionVector[0],
            positionVector[1],
            positionVector[2]
          ),
          Math.abs(rightThrusterStrength) * 0.001,
          "purple",
        ]}
      />
    </>
  );
};

const App = () => {
  const [mounted, setMounted] = useState(false);
  const [params, setParams] = useState({
    mass: 7.34767309e22,
    velocityY: 36.83,
    positionX: 360 + 6.371,
    radius: 1.737,
    ambient: 2,
    directionalLight: 5,
    thrusterStrength: 0,
    leftThrusterStrength: 0,
    rightThrusterStrength: 0,
    boxSize: "Small", // Default box size
  });

  const boxSizes = {
    Small: [0.5, 0.5, 0.5],
    Medium: [1, 1, 1],
    Tall: [0.5, 1.5, 0.5],
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
        min: -500,
        max: 500,
        step: 1,
      })
      .on("change", (ev) =>
        setParams((prev) => ({ ...prev, thrusterStrength: ev.value }))
      );
    pane
      .addBinding(params, "leftThrusterStrength", {
        min: -500,
        max: 500,
        step: 1,
      })
      .on("change", (ev) =>
        setParams((prev) => ({ ...prev, leftThrusterStrength: ev.value }))
      );
    pane
      .addBinding(params, "rightThrusterStrength", {
        min: -500,
        max: 500,
        step: 1,
      })
      .on("change", (ev) =>
        setParams((prev) => ({ ...prev, rightThrusterStrength: ev.value }))
      );
    pane
      .addBinding(params, "boxSize", {
        options: { Small: "Small", Medium: "Medium", Tall: "Tall" },
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
            />
          </Physics>
          <axesHelper args={[50]} />
          <gridHelper args={[40, 100]} rotation={[-Math.PI / 2, 0, 0]} />
        </React.Suspense>
      </Canvas>
    </div>
  );
};

export default App;
