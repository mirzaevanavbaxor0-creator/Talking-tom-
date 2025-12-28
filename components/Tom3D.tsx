
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { TomState } from '../types';

interface Tom3DProps {
  state: TomState;
}

const Tom3D: React.FC<Tom3DProps> = ({ state }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<TomState>(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Sahne Kurulumu ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Işıklandırma (Stüdyo Kalitesi)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const topLight = new THREE.DirectionalLight(0xffffff, 1);
    topLight.position.set(5, 10, 5);
    topLight.castShadow = true;
    scene.add(topLight);

    const rimLight = new THREE.PointLight(0x00aaff, 0.5); // Hafif mavi kontur ışığı
    rimLight.position.set(-5, 2, -5);
    scene.add(rimLight);

    // --- Tom Model Parçaları ---
    const tomGroup = new THREE.Group();

    // Materyaller
    const furMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8, metalness: 0.1 }); 
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.9 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffaaaa });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x440011 });

    // VÜCUT
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.2, 8, 24), furMat);
    body.position.y = 1.2;
    body.castShadow = true;
    tomGroup.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), bellyMat);
    belly.position.set(0, 1.1, 0.35);
    belly.scale.set(1, 1.3, 0.6);
    tomGroup.add(belly);

    // KAFA
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.8;
    tomGroup.add(headGroup);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 32), furMat);
    headGroup.add(skull);

    // Yanaklar (Puffy Cheeks)
    const cheekGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const leftCheek = new THREE.Mesh(cheekGeo, furMat);
    leftCheek.position.set(-0.3, -0.15, 0.55);
    headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, furMat);
    rightCheek.position.set(0.3, -0.15, 0.55);
    headGroup.add(rightCheek);

    // Kulaklar
    const earGeo = new THREE.ConeGeometry(0.25, 0.6, 16);
    const lEar = new THREE.Mesh(earGeo, furMat);
    lEar.position.set(-0.5, 0.7, 0);
    lEar.rotation.z = 0.4;
    headGroup.add(lEar);

    const rEar = new THREE.Mesh(earGeo, furMat);
    rEar.position.set(0.5, 0.7, 0);
    rEar.rotation.z = -0.4;
    headGroup.add(rEar);

    // Gözler
    const eyeGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.25, 0.25, 0.55);
    eyeL.scale.set(1.1, 1.2, 1);
    headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.25, 0.25, 0.55);
    eyeR.scale.set(1.1, 1.2, 1);
    headGroup.add(eyeR);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), pupilMat);
    pupil.position.z = 0.15;
    eyeL.add(pupil.clone());
    eyeR.add(pupil.clone());

    // Burun
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), pinkMat);
    nose.position.set(0, 0.05, 0.75);
    headGroup.add(nose);

    // Bıyıklar (Whiskers)
    const whiskerGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.6);
    const whiskerMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    for (let i = 0; i < 3; i++) {
      const wL = new THREE.Mesh(whiskerGeo, whiskerMat);
      wL.rotation.z = Math.PI / 2;
      wL.rotation.x = (i - 1) * 0.2;
      wL.position.set(-0.6, -0.1, 0.6);
      headGroup.add(wL);

      const wR = new THREE.Mesh(whiskerGeo, whiskerMat);
      wR.rotation.z = Math.PI / 2;
      wR.rotation.x = (i - 1) * 0.2;
      wR.position.set(0.6, -0.1, 0.6);
      headGroup.add(wR);
    }

    // Ağız (Animated Mouth)
    const mouthPivot = new THREE.Group();
    mouthPivot.position.set(0, -0.25, 0.6);
    headGroup.add(mouthPivot);
    const mouthMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.1), mouthMat);
    mouthPivot.add(mouthMesh);

    // Kuyruk (Tail)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.5, -0.6);
    tomGroup.add(tailGroup);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 1.0, 4, 12), furMat);
    tail.rotation.x = -Math.PI / 4;
    tailGroup.add(tail);

    // Uzuvlar
    const limbGeo = new THREE.CapsuleGeometry(0.18, 0.7, 4, 12);
    const armL = new THREE.Mesh(limbGeo, furMat); armL.position.set(-0.9, 1.8, 0); armL.rotation.z = 0.5; tomGroup.add(armL);
    const armR = new THREE.Mesh(limbGeo, furMat); armR.position.set(0.9, 1.8, 0); armR.rotation.z = -0.5; tomGroup.add(armR);
    const legL = new THREE.Mesh(limbGeo, furMat); legL.position.set(-0.4, 0.4, 0); tomGroup.add(legL);
    const legR = new THREE.Mesh(limbGeo, furMat); legR.position.set(0.4, 0.4, 0); tomGroup.add(legR);

    scene.add(tomGroup);
    camera.position.set(0, 2.5, 6);
    camera.lookAt(0, 2, 0);

    // --- Animasyon Döngüsü ---
    let frame = 0;
    const animate = () => {
      const animId = requestAnimationFrame(animate);
      frame += 0.05;
      const curState = stateRef.current;

      // Temel Hareketler
      tomGroup.position.y = Math.sin(frame * 0.5) * 0.04;
      tailGroup.rotation.z = Math.sin(frame * 1.5) * 0.3; // Kuyruk sallama
      tailGroup.rotation.y = Math.cos(frame * 0.5) * 0.2;

      // Göz Kırpma
      const blink = Math.sin(frame * 0.4) > 0.97 ? 0.1 : 1;
      eyeL.scale.y = blink;
      eyeR.scale.y = blink;

      // Duruma Göre Animasyonlar
      switch(curState) {
        case TomState.TALKING:
          mouthPivot.scale.y = 1 + Math.abs(Math.sin(frame * 10)) * 4;
          headGroup.rotation.x = Math.sin(frame * 5) * 0.08;
          headGroup.rotation.z = Math.cos(frame * 2) * 0.05;
          break;
        case TomState.HAPPY:
          headGroup.rotation.y = Math.sin(frame * 3) * 0.2;
          mouthPivot.scale.y = 2;
          tomGroup.position.y += Math.abs(Math.sin(frame * 6)) * 0.25;
          break;
        case TomState.SURPRISED:
          eyeL.scale.set(1.4, 1.4, 1.4);
          eyeR.scale.set(1.4, 1.4, 1.4);
          mouthPivot.scale.set(2, 3, 1);
          headGroup.position.y = 2.8 + Math.abs(Math.sin(frame * 10)) * 0.1;
          break;
        case TomState.EATING:
          mouthPivot.scale.y = 2 + Math.abs(Math.sin(frame * 15)) * 3;
          headGroup.rotation.x = Math.sin(frame * 15) * 0.15;
          break;
        default:
          mouthPivot.scale.set(1, 1, 1);
          eyeL.scale.set(1.1, 1.2, 1);
          eyeR.scale.set(1.1, 1.2, 1);
          headGroup.rotation.set(0, 0, 0);
          break;
      }

      renderer.render(scene, camera);
      return animId;
    };

    const globalAnimId = animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(globalAnimId);
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
      });
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0 select-none pointer-events-none" />;
};

export default Tom3D;
