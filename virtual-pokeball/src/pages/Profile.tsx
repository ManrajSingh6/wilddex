import React from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Card, Button, Container, Row, Col, Image } from "react-bootstrap";
import { format } from 'date-fns';
import { FaArrowUp } from 'react-icons/fa';

interface Post {
  notes: string;
  encodedImage: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  upvotes: number;
}

const dummyPosts: Post[] = Array.from({ length: 5 }, (_, index) => ({
  notes: `This is a note for post ${index + 1}.`,
  encodedImage: "https://picsum.photos/200",
  timestamp: format(new Date(), 'MMM dd, yyyy'),
  latitude: 37.7749 + Math.random() * 0.01,
  longitude: -122.4194 + Math.random() * 0.01,
  upvotes: Math.floor(Math.random() * 100),
}));

const Profile: React.FC = () => {
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleLogout = () => {
    signOut();
  };
  return (
    <div  style={{ paddingBottom: "80px", backgroundColor: "#b0d4b2"  }}>
      <Container className="py-4">
        <Card className="text-center p-3 mb-2 "  style={{border:'none',backgroundColor: "#b0d4b2"}}>
          <Image
            src={user?.imageUrl || "😊"}
            roundedCircle
            className="mx-auto mb-2"
            width={100}
            height={100}
          />
          <h4>{user?.fullName || user?.username || "Username"}</h4>
          <p className="text-muted">{user?.primaryEmailAddress?.emailAddress || "Email"}</p>
        </Card>
        <div className="d-flex justify-content-center">
        <Button variant="danger" onClick={handleLogout} className="mb-3"
           style={{
            backgroundColor: '#53b559',
            borderColor: '#53b559',
            color: 'white'
          }}
         >
          Log Out
        </Button>
        </div>
        <h5 className="mb-2" style={{  fontSize: "1.5rem", color: "#2e4d36",letterSpacing: "0.75px",fontFamily: "Poppins, sans-serif",}}>Recent Posts</h5>
        <Row>
          {dummyPosts.map((post, index) => (
            <Col md={6} key={index} className="mb-3">
              <Card className="shadow-sm">
                <Card.Body>
                  <Image
                    src={post.encodedImage}
                    alt="Post Image"
                    fluid
                    className="mb-2"
                    style={{ maxHeight: "200px", objectFit: "cover" }}
                  />
                  <Card.Text>{post.notes}</Card.Text>
                  <Card.Footer className="text-muted d-flex justify-content-between align-items-center" style={{ fontSize: '0.85rem' }}>
                    <span>{post.timestamp}</span>
                    <span>{post.latitude.toFixed(4)}°N, {post.longitude.toFixed(4)}°W</span>
                  </Card.Footer>
                </Card.Body>
                <Card.Footer className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <FaArrowUp style={{ cursor: 'pointer', marginRight: '5px' }} />
                    <span>{post.upvotes}</span>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
};

export default Profile;
