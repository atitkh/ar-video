import React, { useEffect, useRef } from "react";
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

const Home = () => {
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const sceneRef = useRef(null);
    const controllerRef = useRef(null);
    const reticleRef = useRef(null);
    const hitTestSourceRef = useRef(null);
    const hitTestSourceRequestedRef = useRef(false);
    const spawnedRef = useRef(false);
    const videoRef = useRef(null);

    useEffect(() => {
        let container = containerRef.current;
        let camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        let scene = new THREE.Scene();
        let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        let controller = renderer.xr.getController(0);
        let reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial()
        );

        const texture = new THREE.VideoTexture(videoRef.current);
        texture.format = THREE.RGBAFormat;

        const geometry = new THREE.PlaneGeometry(4, 2, 1, 1);

        const videoMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
        });
        videoMaterial.transparent = true;

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        renderer.xr.setReferenceSpaceType('local');
        container.appendChild(renderer.domElement);

        document.body.appendChild(
            ARButton.createButton(renderer, {
                requiredFeatures: ['hit-test'],
            })
        );

        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);

        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        scene.add(reticle);

        cameraRef.current = camera;
        sceneRef.current = scene;
        rendererRef.current = renderer;
        controllerRef.current = controller;
        reticleRef.current = reticle;

        function onSelect() {
            if (reticle.visible && !spawnedRef.current) {
                const mesh = new THREE.Mesh(geometry, videoMaterial);

                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();

                reticle.matrix.decompose(position, quaternion, scale);
                position.y += 0.8;
                mesh.position.copy(position);
                mesh.quaternion.copy(quaternion);
                mesh.scale.copy(scale);
                scene.add(mesh);

                videoRef.current.play();
                spawnedRef.current = true;
            }
        }
        controller.addEventListener('select', onSelect);
        scene.add(controller);

        return () => {
            container.removeChild(renderer.domElement);
        };
    }, []);

    useEffect(() => {

        function render(timestamp, frame) {
            if (frame) {
                const referenceSpace = rendererRef.current.xr.getReferenceSpace();
                const session = rendererRef.current.xr.getSession();

                if (hitTestSourceRequestedRef.current === false) {
                    session.requestReferenceSpace('viewer').then(function (referenceSpace) {
                        session
                            .requestHitTestSource({
                                space: referenceSpace,
                            })
                            .then(function (source) {
                                hitTestSourceRef.current = source;
                            });
                    });

                    session.addEventListener('end', function () {
                        hitTestSourceRequestedRef.current = false;
                        hitTestSourceRef.current = null;
                        videoRef.current.pause();
                    });

                    hitTestSourceRequestedRef.current = true;
                }

                if (hitTestSourceRef.current) {
                    const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);

                    if (hitTestResults.length) {
                        const hit = hitTestResults[0];
                        reticleRef.current.visible = true;
                        reticleRef.current.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
                    } else {
                        reticleRef.current.visible = false;
                    }
                }

                if (spawnedRef.current) {
                    reticleRef.current.visible = false;
                }
            }

            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }

        rendererRef.current.setAnimationLoop(render);

        return () => {
            rendererRef.current.setAnimationLoop(null);
        };
    }, []);

    return (
        <div>
            <h1>Demo AR Website</h1>
            <div ref={containerRef} style={{ position: 'relative' }}/>

            <video ref={videoRef} id="video" loop muted={false} crossOrigin="anonymous" playsInline style={{ display: 'none' }}>
                <source src={"textures/webxr.webm"}/>
            </video>
        </div>
    );
};

export default Home;