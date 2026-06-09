import { useEffect, useRef } from "react";
import * as THREE from "three";

/** Procedural pickleball skin — yellow-green with perforated holes */
function createPickleballTexture() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#e8f55a");
    grad.addColorStop(0.5, "#c8e600");
    grad.addColorStop(1, "#9bc400");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "#0a1628";
    const holeR = 13;
    const spacing = 34;
    for (let row = 0; row < 18; row++) {
        for (let col = 0; col < 18; col++) {
            const x = col * spacing + (row % 2 ? spacing / 2 : 0) + 20;
            const y = row * spacing * 0.88 + 20;
            ctx.beginPath();
            ctx.arc(x, y, holeR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createCourtTexture() {
    const w = 1024;
    const h = 512;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, "#1a5c47");
    grad.addColorStop(1, "#0d3d32");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 40, w - 160, h - 80);

    ctx.beginPath();
    ctx.moveTo(w / 2, 40);
    ctx.lineTo(w / 2, h - 40);
    ctx.stroke();

    const kitchen = 120;
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 - kitchen, 40);
    ctx.lineTo(w / 2 - kitchen, h - 40);
    ctx.moveTo(w / 2 + kitchen, 40);
    ctx.lineTo(w / 2 + kitchen, h - 40);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createPaddle(group, side = 1) {
    const face = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.72, 0.04),
        new THREE.MeshStandardMaterial({
            color: side > 0 ? "#f59e0b" : "#10b981",
            roughness: 0.35,
            metalness: 0.15,
        })
    );
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.05, 0.35, 12),
        new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.6 })
    );
    handle.position.set(0, -0.52, 0);
    group.add(face, handle);
    return group;
}

export default function ThreeBackground({ children }) {
    const mountRef = useRef(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const isMobile = window.innerWidth < 768;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x060a12, 0.045);

        const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 2.8, 7.5);
        camera.lookAt(0, 0.2, 0);

        const renderer = new THREE.WebGLRenderer({
            antialias: !isMobile,
            alpha: true,
            powerPreference: "high-performance",
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.75));
        renderer.setClearColor(0x060a12, 1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 0.45);
        const keyLight = new THREE.DirectionalLight(0xfff4d6, 1.1);
        keyLight.position.set(4, 8, 5);
        const rimLight = new THREE.DirectionalLight(0x34d399, 0.55);
        rimLight.position.set(-5, 3, -4);
        const accent = new THREE.PointLight(0xf59e0b, 0.9, 20);
        accent.position.set(0, 4, 2);
        scene.add(ambient, keyLight, rimLight, accent);

        const courtTex = createCourtTexture();
        const court = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 7),
            new THREE.MeshStandardMaterial({
                map: courtTex,
                roughness: 0.85,
                metalness: 0.05,
            })
        );
        court.rotation.x = -Math.PI / 2;
        court.position.y = -0.6;
        scene.add(court);

        const grid = new THREE.GridHelper(16, 32, 0x1e4d3a, 0x0f2a22);
        grid.position.y = -0.59;
        grid.material.opacity = 0.25;
        grid.material.transparent = true;
        scene.add(grid);

        const ballTex = createPickleballTexture();
        const ballMat = new THREE.MeshStandardMaterial({
            map: ballTex,
            roughness: 0.45,
            metalness: 0.08,
        });

        const balls = [];
        const ballConfigs = [
            { pos: [-1.8, 1.2, 0.5], scale: 1, phase: 0 },
            { pos: [2.1, 0.9, -0.8], scale: 0.85, phase: 1.4 },
            { pos: [0.3, 1.6, 1.2], scale: 0.7, phase: 2.8 },
        ];
        ballConfigs.forEach(({ pos, scale, phase }) => {
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.38 * scale, 32, 32), ballMat);
            mesh.position.set(...pos);
            mesh.userData = { baseY: pos[1], phase, rotSpeed: 0.35 + scale * 0.2 };
            scene.add(mesh);
            balls.push(mesh);
        });

        const paddles = [];
        const paddleL = createPaddle(new THREE.Group(), -1);
        paddleL.position.set(-2.5, 0.5, 0.8);
        paddleL.rotation.set(-0.4, 0.5, 0.3);
        paddleL.userData = { phase: 0.5 };
        scene.add(paddleL);
        paddles.push(paddleL);

        const paddleR = createPaddle(new THREE.Group(), 1);
        paddleR.position.set(2.4, 0.45, -0.5);
        paddleR.rotation.set(-0.35, -0.6, -0.25);
        paddleR.userData = { phase: 2.1 };
        scene.add(paddleR);
        paddles.push(paddleR);

        const net = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.55, 3.2),
            new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.7, transparent: true, opacity: 0.75 })
        );
        net.position.set(0, 0.05, 0);
        scene.add(net);

        const clock = new THREE.Clock();
        let animId = 0;
        let running = true;

        const animate = () => {
            if (!running) return;
            animId = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();
            const speed = reducedMotion ? 0.15 : 1;

            balls.forEach((ball) => {
                const { baseY, phase, rotSpeed } = ball.userData;
                if (!reducedMotion) {
                    ball.position.y = baseY + Math.sin(t * 1.2 * speed + phase) * 0.18;
                    ball.rotation.y += rotSpeed * 0.016 * speed;
                    ball.rotation.x += rotSpeed * 0.008 * speed;
                }
            });

            paddles.forEach((paddle) => {
                if (!reducedMotion) {
                    paddle.rotation.z = Math.sin(t * 0.8 * speed + paddle.userData.phase) * 0.12;
                    paddle.position.y = 0.45 + Math.sin(t * 1.1 * speed + paddle.userData.phase) * 0.08;
                }
            });

            if (!reducedMotion) {
                camera.position.x = Math.sin(t * 0.12 * speed) * 0.6;
                camera.position.z = 7.5 + Math.cos(t * 0.1 * speed) * 0.35;
                camera.lookAt(0, 0.3, 0);
            }

            renderer.render(scene, camera);
        };
        animate();

        const onResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener("resize", onResize);

        const onVisibility = () => {
            if (document.hidden) {
                running = false;
                cancelAnimationFrame(animId);
            } else if (!running) {
                running = true;
                animate();
            }
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            running = false;
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", onResize);
            document.removeEventListener("visibilitychange", onVisibility);
            ballTex.dispose();
            courtTex.dispose();
            ballMat.dispose();
            renderer.dispose();
            if (mount.contains(renderer.domElement)) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            <div ref={mountRef} className="fixed inset-0 z-0" aria-hidden="true" />

            {/* Readability overlays — glass depth per UI Pro Max 3D + glassmorphism */}
            <div className="fixed inset-0 z-[1] pointer-events-none bg-gradient-to-b from-[#060a12]/70 via-[#060a12]/40 to-[#060a12]/85" />
            <div className="fixed inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,#060a12_75%)]" />

            <div className="relative z-10 w-full min-h-screen">
                {children}
            </div>
        </div>
    );
}
