import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Profile.css"; // Import the updated CSS file

const Profile = () => {
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    phone_number: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:8000/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(response.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  // Update profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:8000/profile/update",
        { email: profile.email, phone_number: profile.phone_number },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Failed to update profile.");
    }
  };

  // Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:8000/profile/reset_password",
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Password updated successfully!");
      setNewPassword("");
    } catch (error) {
      console.error("Error resetting password:", error);
      setMessage("Failed to reset password.");
    }
  };

  return (
    <div className="profile-container">
      <h1>Profile</h1>
      <form onSubmit={handleUpdateProfile}>
        <div>
          <label>Username:</label>
          <input type="text" value={profile.username} readOnly />
        </div>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label>Phone Number:</label>
          <input
            type="text"
            value={profile.phone_number}
            onChange={(e) =>
              setProfile({ ...profile, phone_number: e.target.value })
            }
            placeholder="Enter your phone number"
          />
        </div>
        <button type="submit">Update Profile</button>
      </form>

      <h2>Reset Password</h2>
      <form onSubmit={handleResetPassword}>
        <div>
          <label>New Password:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter a new password"
          />
        </div>
        <button type="submit">Reset Password</button>
      </form>

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default Profile;