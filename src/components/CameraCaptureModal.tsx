import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, SwitchCamera, RotateCcw, Check, AlertCircle, Sparkles, Image as ImageIcon } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturePhoto: (photo: { name: string; size: string; url: string; type: string; isPhoto: boolean }) => void;
  darkMode?: boolean;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapturePhoto,
  darkMode = true,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackFileInputRef = useRef<HTMLInputElement>(null);

  // Stop any active media stream
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Check if device has multiple cameras (e.g. front & back on mobile)
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }).catch(() => {});
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setIsStartingCamera(true);
    setCameraError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was blocked. Please allow camera permissions in your browser or use the fallback camera button below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device detected on this system. You can still upload or take a photo using the file camera picker.');
      } else {
        setCameraError(err.message || 'Unable to access camera.');
      }
    } finally {
      setIsStartingCamera(false);
    }
  }, [stopStream]);

  // Hook up video stream when modal opens or facing mode changes
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, capturedImage, startCamera, stopStream]);

  // Take snapshot from video feed
  const handleSnapPhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If using user/front camera, horizontally flip so it feels natural like a selfie mirror
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Get high-fidelity JPEG data url
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopStream();
  };

  // Switch between front and back camera
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Confirm and attach photo to chat
  const handleConfirmPhoto = () => {
    if (!capturedImage) return;

    // Approximate size in KB
    const head = 'data:image/jpeg;base64,';
    const base64Length = capturedImage.length - head.length;
    const sizeInBytes = Math.round((base64Length * 3) / 4);
    const sizeInKB = `${(sizeInBytes / 1024).toFixed(1)} KB`;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const photoName = `Photo_${timestamp}.jpg`;

    onCapturePhoto({
      name: photoName,
      size: sizeInKB,
      url: capturedImage,
      type: 'image/jpeg',
      isPhoto: true,
    });

    handleClose();
  };

  // Fallback file input handler (useful if getUserMedia is denied or for mobile native camera)
  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setCapturedImage(dataUrl);
          setCameraError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClose = () => {
    stopStream();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full max-w-lg rounded-2xl overflow-hidden border shadow-2xl flex flex-col ${
            darkMode
              ? 'bg-slate-900 border-white/10 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  Take Photo
                  {capturedImage && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Photo Captured
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {capturedImage
                    ? 'Review your photo before sending to chat'
                    : 'Frame your shot and click the camera shutter button'}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Viewfinder / Preview Screen */}
          <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
            {capturedImage ? (
              // Captured Photo Preview
              <img
                src={capturedImage}
                alt="Captured photo preview"
                className="w-full h-full object-contain"
              />
            ) : cameraError ? (
              // Camera Error / Permission Blocked Message
              <div className="p-6 text-center max-w-sm flex flex-col items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-amber-300">Camera Access Issue</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => fallbackFileInputRef.current?.click()}
                  className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Use Device Camera / Choose Photo</span>
                </button>
              </div>
            ) : (
              // Live Video Stream Viewfinder
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  }`}
                />

                {/* Viewfinder overlay grid guides */}
                <div className="absolute inset-0 pointer-events-none border border-white/20 m-4 rounded-xl">
                  {/* Viewfinder corner brackets */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/80" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/80" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/80" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/80" />
                  
                  {/* Subtle center reticle */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <div className="w-6 h-6 border border-dashed border-white/60 rounded-full" />
                  </div>
                </div>

                {isStartingCamera && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span>Initializing Camera...</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Hidden canvas for snapshot rendering */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Fallback file input for direct device camera capture */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fallbackFileInputRef}
              onChange={handleFallbackFile}
              className="hidden"
            />
          </div>

          {/* Controls Bar */}
          <div className="p-4 bg-white/5 border-t border-white/10 flex items-center justify-between gap-3">
            {capturedImage ? (
              // Review Controls
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmPhoto}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Attach & Use Photo</span>
                </button>
              </>
            ) : (
              // Live Camera Controls
              <>
                {/* Switch Camera Button (Front/Back) */}
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  disabled={!!cameraError}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Switch Camera (Front / Back)"
                >
                  <SwitchCamera className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px] font-mono">
                    {facingMode === 'user' ? 'Front' : 'Back'}
                  </span>
                </button>

                {/* Main Shutter Button */}
                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  disabled={isStartingCamera || !!cameraError}
                  className="relative group w-14 h-14 rounded-full border-4 border-white/90 p-1 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-black/40"
                  title="Click to Take Photo"
                >
                  <div className="w-full h-full rounded-full bg-white group-hover:bg-blue-400 transition-colors shadow-inner flex items-center justify-center">
                    <Camera className="w-5 h-5 text-slate-900 group-hover:text-white transition-colors" />
                  </div>
                </button>

                {/* Device Camera Roll / File Fallback Button */}
                <button
                  type="button"
                  onClick={() => fallbackFileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Choose from photo library or device camera"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px] font-mono">Library</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
