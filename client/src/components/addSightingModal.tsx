import { JSX, useEffect, useRef, useState } from "react";
import { Modal } from "./modal";
import { LatitudeLongitude } from "@/types/mapTypes";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { LuSwitchCamera } from "react-icons/lu";
import { TbCapture } from "react-icons/tb";
import { RiResetLeftFill } from "react-icons/ri";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { IoIosAddCircle } from "react-icons/io";
import { useAuth } from "@/hooks/useAuth";
import { useAddSighting } from "@/hooks/useAddSighting";
import { GOOGLE_MAPS_API_BASE_URL } from "@/App";

const MAX_NOTES_LENGTH_CHARS = 250;

interface AddSightingModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export interface AddSightingFormData {
  readonly encodedImage: string | null;
  readonly notes: string | null;
  readonly location: LatitudeLongitude | null;
  readonly timestamp: string;
}

export function AddSightingModal({
  isOpen,
  onClose,
}: AddSightingModalProps): JSX.Element {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    addSighting,
    loading: addSightingLoading,
    error: addSightingError,
  } = useAddSighting();

  const [formData, setFormData] = useState<AddSightingFormData>(
    getDefaultFormData()
  );

  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function getDefaultFormData(): AddSightingFormData {
    return {
      encodedImage: null,
      notes: null,
      location: null,
      timestamp: "",
    };
  }

  async function initializeCamera(
    facingMode: "user" | "environment"
  ): Promise<void> {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast({
        title: "Error accessing camera",
        description: "Please try again later.",
      });
    }
  }

  function toggleCamera(): void {
    setIsFrontCamera((prev) => !prev);
    initializeCamera(isFrontCamera ? "environment" : "user");
  }

  function stopCamera(): void {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function retakeImage(): void {
    setFormData({ ...formData, encodedImage: null });
    initializeCamera("user");
  }

  function handleCapture(): void {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        const photoUrl = canvasRef.current.toDataURL("image/png");
        setFormData({ ...formData, encodedImage: photoUrl });
        stopCamera();
      }
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!user) {
      return;
    }

    if (!formData.location || !formData.encodedImage) {
      toast({
        title: "Error",
        description: "Please capture an image and location.",
      });
      return;
    }

    await addSighting({
      userId: user.id,
      encodedImage: formData.encodedImage,
      location: formData.location,
      notes: formData.notes,
      timestamp: new Date().toISOString(),
    });

    if (!addSightingLoading && !addSightingError) {
      onClose();
    }
  }

  async function fetchUserLocation(): Promise<
    { lat: number; lng: number } | undefined
  > {
    const googleMapsResponse = await fetch(GOOGLE_MAPS_API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!googleMapsResponse.ok) {
      toast({
        title: "Error fetching user location",
        description: "Please try again later.",
      });
      return;
    }

    const locationJSON = await googleMapsResponse.json();
    if (!locationJSON.location) {
      return undefined;
    }

    return {
      lat: locationJSON.location.latitude,
      lng: locationJSON.location.longitude,
    };
  }

  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      initializeCamera("user");

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData({
            ...formData,
            location: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            },
          });
        },
        async () => {
          const location = await fetchUserLocation();
          if (location) {
            setFormData({
              ...formData,
              location,
            });
          }
        }
      );
    } else {
      stopCamera();
      setFormData(getDefaultFormData());
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      header="Add a New Sighting"
      subHeader="Fill in the details below to add a new sighting."
      onClose={onClose}
      isContentLoading={addSightingLoading}
      content={
        <div className="flex flex-col space-y-4 p-1">
          {formData.encodedImage ? (
            <img src={formData.encodedImage} alt="Captured-image" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                width="100%"
                height="auto"
              />
              <canvas
                ref={canvasRef}
                className="hidden"
                width={640}
                height={480}
              />
            </>
          )}
          <div className="flex items-center space-x-2">
            {formData.encodedImage ? (
              <Button
                onClick={retakeImage}
                className="font-normal bg-red-500 text-white hover:bg-red-600"
              >
                <RiResetLeftFill />
                Retake Image
              </Button>
            ) : (
              <>
                <Button onClick={toggleCamera} className="font-normal">
                  <LuSwitchCamera />
                  Flip Camera
                </Button>
                <Button
                  onClick={handleCapture}
                  className="font-normal bg-green-500 text-white hover:bg-green-600"
                >
                  <TbCapture />
                  Capture Image
                </Button>
              </>
            )}
          </div>
          <Textarea
            label="Notes"
            placeholder="Add some notes here (optional)..."
            value={formData.notes ?? ""}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            maxLength={MAX_NOTES_LENGTH_CHARS}
          />
          <div className="flex items-center space-x-2">
            <Input
              value={formData.location?.lat || ""}
              type="string"
              label="Latitude"
              readOnly
              disabled
            />
            <Input
              value={formData.location?.lng || ""}
              type="string"
              label="Longitude"
              readOnly
              disabled
            />
            <Input
              value={formData.timestamp || new Date().toISOString()}
              type="string"
              label="Timestamp"
              readOnly
              disabled
            />
          </div>
          <Button
            className="font-normal text-base"
            disabled={
              formData.encodedImage === null || formData.location === null
            }
            onClick={handleSubmit}
          >
            <IoIosAddCircle />
            Submit
          </Button>
        </div>
      }
    />
  );
}
