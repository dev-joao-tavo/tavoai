import { useState } from "react";
import axios from "../api/api";

const Profile = ({ user }) => {
  const [phoneNumber, setPhoneNumber] = useState(user.user_wpp_phone_number || "");
  const [password, setPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/users/${user.id}`, 
        { user_wpp_phone_number: phoneNumber, password }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-lg w-full">

        <div className="mt-6">
          <label className="block text-gray-700 font-semibold">WhatsApp Number:</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={!isEditing}
          />

          <label className="block text-gray-700 font-semibold mt-4">New Password:</label>
          <input
            type="password"
            className="w-full p-2 border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div className="mt-6 flex justify-between">
          {isEditing ? (
            <>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                onClick={handleUpdate}
              >
                Save Changes
              </button>
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition w-full"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
