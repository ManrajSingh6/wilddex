import { JSX, useEffect, useState } from "react";
import {
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { LatitudeLongitude } from "@/types/mapTypes";
import { useToast } from "@/hooks/use-toast";
import { Container } from "@/components/container";
import { GOOGLE_MAPS_API_BASE_URL } from "@/App";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { IoIosAddCircle } from "react-icons/io";
import { AddSightingModal } from "@/components/addSightingModal";
import { useFetchPosts } from "@/hooks/useFetchPosts";
import { CustomImage } from "@/components/customImage";
import { formatAnimalName } from "@/utils/formatting";

export function HomePage(): JSX.Element {
  const { toast } = useToast();

  const { posts: allSightings } = useFetchPosts({ userId: undefined });

  const [userLocation, setUserLocation] = useState<
    LatitudeLongitude | undefined
  >(undefined);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [selectedMarkerId, setSelectedMarkerId] = useState<number | null>(null);

  async function fetchUserLocation(): Promise<void> {
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
    if (locationJSON.location) {
      setUserLocation({
        lat: locationJSON.location.lat,
        lng: locationJSON.location.lng,
      });
    }
  }

  useEffect(() => {
    fetchUserLocation();
  }, []);

  const markers = allSightings.map((sighting) => {
    return {
      id: sighting.id,
      position: { lat: sighting.latitude, lng: sighting.longitude },
      imgUrl: sighting.imageUrl,
      animal: sighting.animal,
    };
  });

  const selectedMarker = markers.find(
    (marker) => marker.id === selectedMarkerId
  );

  return (
    <>
      <Container>
        <div className="flex justify-between items-center">
          <Header
            header="Map Overview"
            subtext="Locate and explore wildlife around the map."
          />
          <Button
            className="font-normal"
            onClick={() => setIsAddModalOpen(true)}
          >
            <IoIosAddCircle />
            Add Sighting
          </Button>
        </div>
        <Map
          gestureHandling="greedy" // Allows full user control
          disableDefaultUI={false} // Ensure default UI elements are enabled
          mapId="e21db703daeafd54"
          className="h-[68vh] w-full mt-4"
          defaultCenter={userLocation}
        >
          {userLocation && (
            <AdvancedMarker position={userLocation}>
              <Pin background="red" borderColor="black" glyphColor="white" />
            </AdvancedMarker>
          )}
          {markers.map((marker) => (
            <AdvancedMarker
              key={marker.id}
              position={marker.position}
              onClick={() => setSelectedMarkerId(marker.id)}
            >
              <Pin background="blue" borderColor="white" glyphColor="yellow" />
            </AdvancedMarker>
          ))}
          {selectedMarker !== undefined && (
            <InfoWindow
              position={selectedMarker.position}
              className="w-32 h-32 flex flex-col space-y-2"
              onClose={() => setSelectedMarkerId(null)}
            >
              <p>{formatAnimalName(selectedMarker.animal)}</p>
              <CustomImage
                src={selectedMarker.imgUrl}
                alt="sighitng-marker-img"
                className="w-24 h-24 object-cover rounded-lg"
              />
            </InfoWindow>
          )}
        </Map>
      </Container>
      <AddSightingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </>
  );
}
