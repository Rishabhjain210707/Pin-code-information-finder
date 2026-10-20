<?php

$host = "sql103.infinityfree.com";
$user = "if0_42502777";
$pass = "CNdaB5HLoPwG";
$dbname = "if0_42502777_internship"; // Replace '_internship' if your database name in InfinityFree is different

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die("Connection Failed: " . $conn->connect_error);
}

?>