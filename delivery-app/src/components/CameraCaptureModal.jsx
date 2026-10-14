import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

/**
 * CameraCaptureModal
 * Live camera capture with fallback file input for delivery & handover verification
 */
export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  mode = 'package', // 'package' | 'selfie'
  title,
  subtitle,
  confirmText
}) {
  const isSelfie = mode === 'selfie';
  const displayTitle = title || (isSelfie ? 'Rider Identity Verification' : 'Capture Package Photo');
  const displaySubtitle = subtitle || (isSelfie ? 'Take a live front-camera selfie to verify attendance & go online' : 'Take a live photo using your device camera for delivery verification');
  const displayConfirmText = confirmText || (isSelfie ? 'Verify Face & Go Online' : 'Confirm & Hand Over');

  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [loading, setLoading] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setLoading(true);
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera hardware access is not supported on this browser.');
      }

      const constraints = {
        video: {
          facingMode: isSelfie ? { ideal: 'user' } : { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
      setLoading(false);
    } catch (err) {
      console.warn('Camera access error:', err.message);
      setCameraError(
        isSelfie
          ? 'Front camera access is required to verify identity before going online. Please allow camera permissions in your browser settings.'
          : 'Could not access live camera. Please grant camera permission or use the direct camera trigger below.'
      );
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (isSelfie) {
      // Mirror the selfie horizontally so it looks natural like in the viewfinder
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleDirectCameraInput = (e) => {
    // Only used for package mode when camera fails, NEVER for selfie mode
    if (isSelfie) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              {displayTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{displaySubtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview */}
        <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Verification preview"
              className="w-full h-full object-cover"
            />
          ) : cameraError ? (
            <div className="p-6 text-center">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-xs text-slate-300 mb-4">{cameraError}</p>
              {isSelfie ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" /> Retry Front Camera Access
                </button>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleDirectCameraInput}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 mx-auto"
                  >
                    <Camera className="w-4 h-4" /> Open Camera / Gallery
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={isSelfie ? { transform: 'scaleX(-1)' } : undefined}
                className="w-full h-full object-cover"
              />
              {isSelfie ? (
                <div className="absolute inset-8 rounded-full border-2 border-emerald-400/80 pointer-events-none flex flex-col items-center justify-end pb-3 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                  <span className="text-[11px] font-black text-white bg-black/70 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                    Center Face Here
                  </span>
                </div>
              ) : (
                <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none flex items-center justify-center">
                  <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 absolute top-0 left-0" />
                  <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 absolute top-0 right-0" />
                  <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 absolute bottom-0 left-0" />
                  <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 absolute bottom-0 right-0" />
                  <span className="text-[11px] font-semibold text-white/70 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                    Align Package Here
                  </span>
                </div>
              )}
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-3">
          {capturedImage ? (
            <>
              <button
                onClick={retakePhoto}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Retake
              </button>
              <button
                onClick={confirmPhoto}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
              >
                <Check className="w-4 h-4" /> {displayConfirmText}
              </button>
            </>
          ) : (
            <button
              onClick={takePhoto}
              disabled={loading || Boolean(cameraError)}
              className="py-3 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 text-slate-950 text-sm font-extrabold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <div className="w-4 h-4 rounded-full bg-slate-950" /> {isSelfie ? 'Capture Verification Selfie' : 'Take Photo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
