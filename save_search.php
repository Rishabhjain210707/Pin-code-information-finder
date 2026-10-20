<?php
require "db.php";

$data = json_decode(file_get_contents("php://input"), true);

$search_type = $data['search_type'];
$search_value = $data['search_value'];
$state = $data['state'];
$district = $data['district'];
$post_office = $data['post_office'];
$pincode = $data['pincode'];
$delivery_status = $data['delivery_status'];

$stmt = $conn->prepare("INSERT INTO search_history
(search_type, search_value, state, district, post_office, pincode, delivery_status)
VALUES (?, ?, ?, ?, ?, ?, ?)");

$stmt->bind_param(
    "sssssss",
    $search_type,
    $search_value,
    $state,
    $district,
    $post_office,
    $pincode,
    $delivery_status
);

if ($stmt->execute()) {
    echo "Success";
} else {
    echo "Failed";
}

$stmt->close();
$conn->close();
?>