// src/components/DentalArch3D.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export const TOOTH_ANATOMY = {
  // Upper Right (Q1)
  "18": "Upper Right 3rd Molar (Wisdom)",
  "17": "Upper Right 2nd Molar (3 Canals)",
  "16": "Upper Right 1st Molar (MB1, MB2, DB, P)",
  "15": "Upper Right 2nd Premolar",
  "14": "Upper Right 1st Premolar (2 Canals: B, P)",
  "13": "Upper Right Canine (Eye Tooth)",
  "12": "Upper Right Lateral Incisor",
  "11": "Upper Right Central Incisor",
  // Upper Left (Q2)
  "21": "Upper Left Central Incisor",
  "22": "Upper Left Lateral Incisor",
  "23": "Upper Left Canine (Eye Tooth)",
  "24": "Upper Left 1st Premolar (2 Canals: B, P)",
  "25": "Upper Left 2nd Premolar",
  "26": "Upper Left 1st Molar (MB1, MB2, DB, P)",
  "27": "Upper Left 2nd Molar (3 Canals)",
  "28": "Upper Left 3rd Molar (Wisdom)",
  // Lower Left (Q3)
  "31": "Lower Left Central Incisor",
  "32": "Lower Left Lateral Incisor",
  "33": "Lower Left Canine",
  "34": "Lower Left 1st Premolar",
  "35": "Lower Left 2nd Premolar",
  "36": "Lower Left 1st Molar (Mesial: MB, ML; Distal)",
  "37": "Lower Left 2nd Molar (Curved Roots)",
  "38": "Lower Left 3rd Molar (Wisdom)",
  // Lower Right (Q4)
  "48": "Lower Right 3rd Molar (Wisdom)",
  "47": "Lower Right 2nd Molar (Curved Roots)",
  "46": "Lower Right 1st Molar (Mesial: MB, ML; Distal)",
  "45": "Lower Right 2nd Premolar",
  "44": "Lower Right 1st Premolar",
  "43": "Lower Right Canine",
  "42": "Lower Right Lateral Incisor",
  "41": "Lower Right Central Incisor",
};

// FDI Teeth Definitions along the Parabolic Arch
const ALL_TEETH_DEF = [
  // Upper Right Q1 (18 to 11)
  { id: "18", type: "molar",    angle: -1.35, arch: "upper", radius: 4.8 },
  { id: "17", type: "molar",    angle: -1.15, arch: "upper", radius: 4.7 },
  { id: "16", type: "molar",    angle: -0.92, arch: "upper", radius: 4.6 },
  { id: "15", type: "premolar", angle: -0.70, arch: "upper", radius: 4.4 },
  { id: "14", type: "premolar", angle: -0.50, arch: "upper", radius: 4.2 },
  { id: "13", type: "canine",   angle: -0.32, arch: "upper", radius: 4.0 },
  { id: "12", type: "incisor",  angle: -0.18, arch: "upper", radius: 3.8 },
  { id: "11", type: "incisor",  angle: -0.06, arch: "upper", radius: 3.7 },
  // Upper Left Q2 (21 to 28)
  { id: "21", type: "incisor",  angle: 0.06,  arch: "upper", radius: 3.7 },
  { id: "22", type: "incisor",  angle: 0.18,  arch: "upper", radius: 3.8 },
  { id: "23", type: "canine",   angle: 0.32,  arch: "upper", radius: 4.0 },
  { id: "24", type: "premolar", angle: 0.50,  arch: "upper", radius: 4.2 },
  { id: "25", type: "premolar", angle: 0.70,  arch: "upper", radius: 4.4 },
  { id: "26", type: "molar",    angle: 0.92,  arch: "upper", radius: 4.6 },
  { id: "27", type: "molar",    angle: 1.15,  arch: "upper", radius: 4.7 },
  { id: "28", type: "molar",    angle: 1.35,  arch: "upper", radius: 4.8 },

  // Lower Right Q4 (48 to 41)
  { id: "48", type: "molar",    angle: -1.35, arch: "lower", radius: 4.6 },
  { id: "47", type: "molar",    angle: -1.15, arch: "lower", radius: 4.5 },
  { id: "46", type: "molar",    angle: -0.92, arch: "lower", radius: 4.4 },
  { id: "45", type: "premolar", angle: -0.70, arch: "lower", radius: 4.2 },
  { id: "44", type: "premolar", angle: -0.50, arch: "lower", radius: 4.0 },
  { id: "43", type: "canine",   angle: -0.32, arch: "lower", radius: 3.8 },
  { id: "42", type: "incisor",  angle: -0.18, arch: "lower", radius: 3.6 },
  { id: "41", type: "incisor",  angle: -0.06, arch: "lower", radius: 3.5 },
  // Lower Left Q3 (31 to 38)
  { id: "31", type: "incisor",  angle: 0.06,  arch: "lower", radius: 3.5 },
  { id: "32", type: "incisor",  angle: 0.18,  arch: "lower", radius: 3.6 },
  { id: "33", type: "canine",   angle: 0.32,  arch: "lower", radius: 3.8 },
  { id: "34", type: "premolar", angle: 0.50,  arch: "lower", radius: 4.0 },
  { id: "35", type: "premolar", angle: 0.70,  arch: "lower", radius: 4.2 },
  { id: "36", type: "molar",    angle: 0.92,  arch: "lower", radius: 4.4 },
  { id: "37", type: "molar",    angle: 1.15,  arch: "lower", radius: 4.5 },
  { id: "38", type: "molar",    angle: 1.35,  arch: "lower", radius: 4.6 },
];

export default function DentalArch3D({ selectedTooth, onSelectTooth }) {
  const mountRef = useRef(null);
  const [hoveredTooth, setHoveredTooth] = useState(null);
  const [archFilter, setArchFilter] = useState("all"); // "all" | "upper" | "lower"
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const toothMeshesRef = useRef([]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = 360;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a192f); // Deep clinical dark background

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 11, 13);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.replaceChildren(renderer.domElement);

    // 3. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 25;
    controls.minDistance = 5;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(10, 15, 12);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight2.position.set(-10, 10, -10);
    scene.add(dirLight2);

    const blueRimLight = new THREE.PointLight(0x00b4d8, 1.5, 30);
    blueRimLight.position.set(0, -6, 8);
    scene.add(blueRimLight);

    // 5. Materials
    const normalMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f4f8,
      roughness: 0.25,
      metalness: 0.1,
    });

    const selectedMaterial = new THREE.MeshStandardMaterial({
      color: 0x00b4d8,
      emissive: 0x0077b6,
      emissiveIntensity: 0.6,
      roughness: 0.15,
      metalness: 0.2,
    });

    // Gingiva / Gum Arch Curves
    const createGingivaArch = (isUpper) => {
      const yPos = isUpper ? 1.05 : -1.05;
      const points = [];
      for (let a = -1.4; a <= 1.4; a += 0.1) {
        const r = isUpper ? 4.4 : 4.2;
        const x = r * Math.sin(a);
        const z = -r * (1 - Math.cos(a)) * 1.35 + 2.0;
        points.push(new THREE.Vector3(x, yPos + (isUpper ? 0.3 : -0.3), z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.45, 12, false);
      const gumMat = new THREE.MeshStandardMaterial({
        color: isUpper ? 0x93335b : 0x7a2948,
        roughness: 0.5,
        transparent: true,
        opacity: 0.55
      });
      return new THREE.Mesh(tubeGeo, gumMat);
    };

    scene.add(createGingivaArch(true));
    scene.add(createGingivaArch(false));

    // 6. Build Individual Anatomical Teeth
    const meshes = [];

    ALL_TEETH_DEF.forEach((tDef) => {
      const isUpper = tDef.arch === "upper";
      const yBase = isUpper ? 1.0 : -1.0;
      const x = tDef.radius * Math.sin(tDef.angle);
      const z = -tDef.radius * (1 - Math.cos(tDef.angle)) * 1.35 + 2.0;

      let geo;

      // Authentic anatomical tooth shapes
      if (tDef.type === "molar") {
        // Multi-cusp box/rounded molar
        geo = new THREE.BoxGeometry(0.72, 0.85, 0.78, 2, 2, 2);
      } else if (tDef.type === "premolar") {
        // Bicuspid premolar
        geo = new THREE.CylinderGeometry(0.32, 0.34, 0.85, 12);
      } else if (tDef.type === "canine") {
        // Pointed canine crown
        geo = new THREE.ConeGeometry(0.32, 0.95, 10);
      } else {
        // Flat incisor
        geo = new THREE.BoxGeometry(0.48, 0.9, 0.28);
      }

      const isSelected = selectedTooth === tDef.id;
      const mat = isSelected ? selectedMaterial : normalMaterial;
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(x, isSelected ? yBase + (isUpper ? 0.3 : -0.3) : yBase, z);

      // Rotate tooth naturally facing outward along arch normal
      mesh.rotation.y = -tDef.angle;
      if (tDef.type === "canine" && isUpper) {
        mesh.rotation.x = Math.PI; // Flip upper canine point downwards
      }

      mesh.userData = {
        toothId: tDef.id,
        arch: tDef.arch,
        name: TOOTH_ANATOMY[tDef.id] || `Tooth #${tDef.id}`,
        yBase: yBase,
        isUpper: isUpper,
      };

      scene.add(mesh);
      meshes.push(mesh);
    });

    toothMeshesRef.current = meshes;

    // 7. Raycasting & Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getIntersectedTooth = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);
      return intersects.length > 0 ? intersects[0].object : null;
    };

    const onPointerMove = (e) => {
      const hit = getIntersectedTooth(e);
      if (hit) {
        container.style.cursor = "pointer";
        setHoveredTooth(hit.userData);
      } else {
        container.style.cursor = "default";
        setHoveredTooth(null);
      }
    };

    const onClick = (e) => {
      const hit = getIntersectedTooth(e);
      if (hit) {
        onSelectTooth(hit.userData.toothId);
      }
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClick);

    // 8. Animation Loop
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize handler
    const onResize = () => {
      const w = container.clientWidth || 640;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(reqId);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
    };
  }, []);

  // Update tooth highlight & elevation when selectedTooth prop changes
  useEffect(() => {
    if (!toothMeshesRef.current) return;

    toothMeshesRef.current.forEach((mesh) => {
      const isSelected = mesh.userData.toothId === selectedTooth;
      const isUpper = mesh.userData.isUpper;
      const yBase = mesh.userData.yBase;

      // Filter visibility based on archFilter
      if (archFilter === "upper" && !isUpper) {
        mesh.visible = false;
      } else if (archFilter === "lower" && isUpper) {
        mesh.visible = false;
      } else {
        mesh.visible = true;
      }

      if (isSelected) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x00b4d8,
          emissive: 0x0077b6,
          emissiveIntensity: 0.7,
          roughness: 0.15,
        });
        mesh.position.y = yBase + (isUpper ? 0.35 : -0.35);
      } else {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0xf0f4f8,
          roughness: 0.25,
          metalness: 0.1,
        });
        mesh.position.y = yBase;
      }
    });
  }, [selectedTooth, archFilter]);

  // Quick Camera Presets
  const setCameraView = (view) => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    if (view === "upper") {
      setArchFilter("upper");
      camera.position.set(0, 14, 2);
      controls.target.set(0, 1.2, 0);
    } else if (view === "lower") {
      setArchFilter("lower");
      camera.position.set(0, -14, 2);
      controls.target.set(0, -1.2, 0);
    } else {
      setArchFilter("all");
      camera.position.set(0, 11, 13);
      controls.target.set(0, 0, 0);
    }
    controls.update();
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px", marginBottom: "18px", position: "relative", overflow: "hidden" }}>
      
      {/* Viewport Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>🧊</span>
            <span>3D Interactive Dental Arch (Click Tooth to Select)</span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Rotate with click & drag · Zoom with scroll · Click any 3D tooth
          </span>
        </div>

        {/* Selected Tooth Info Badge */}
        {selectedTooth ? (
          <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary-light)", background: "var(--info-bg)", border: "1px solid var(--primary-light)", padding: "4px 10px", borderRadius: "20px" }}>
            ✓ Selected: #{selectedTooth} · {TOOTH_ANATOMY[selectedTooth] || ""}
          </span>
        ) : (
          <span style={{ fontSize: "11.5px", color: "var(--text-muted)", background: "var(--surface-card)", padding: "4px 10px", borderRadius: "20px", border: "1px solid var(--border)" }}>
            No tooth selected
          </span>
        )}
      </div>

      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: "360px",
          borderRadius: "10px",
          overflow: "hidden",
          background: "#0a192f",
          position: "relative",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.6)"
        }}
      />

      {/* Hover Tooltip Overlay */}
      {hoveredTooth && (
        <div style={{
          position: "absolute",
          bottom: "64px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(10, 25, 47, 0.9)",
          border: "1px solid var(--primary-light)",
          color: "#fff",
          padding: "6px 14px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "600",
          pointerEvents: "none",
          boxShadow: "0 4px 14px rgba(0,180,216,0.3)",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}>
          <span style={{ color: "var(--primary-light)" }}>Tooth #{hoveredTooth.toothId}</span>
          <span>·</span>
          <span>{hoveredTooth.name}</span>
        </div>
      )}

      {/* Camera Angle Presets Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setCameraView("all")}
            style={{
              padding: "4px 10px", fontSize: "11.5px", fontWeight: archFilter === "all" ? "700" : "500",
              background: archFilter === "all" ? "var(--primary)" : "var(--surface-card)",
              color: archFilter === "all" ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer"
            }}
          >
            🦷 Full Arch (All)
          </button>
          <button
            type="button"
            onClick={() => setCameraView("upper")}
            style={{
              padding: "4px 10px", fontSize: "11.5px", fontWeight: archFilter === "upper" ? "700" : "500",
              background: archFilter === "upper" ? "var(--primary)" : "var(--surface-card)",
              color: archFilter === "upper" ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer"
            }}
          >
            ▲ Upper (Maxilla)
          </button>
          <button
            type="button"
            onClick={() => setCameraView("lower")}
            style={{
              padding: "4px 10px", fontSize: "11.5px", fontWeight: archFilter === "lower" ? "700" : "500",
              background: archFilter === "lower" ? "var(--primary)" : "var(--surface-card)",
              color: archFilter === "lower" ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer"
            }}
          >
            ▼ Lower (Mandible)
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCameraView("all")}
          style={{
            padding: "4px 10px", fontSize: "11.5px", color: "var(--primary-light)",
            background: "transparent", border: "none", cursor: "pointer", fontWeight: "600"
          }}
        >
          🔄 Reset 3D Camera
        </button>
      </div>
    </div>
  );
}
