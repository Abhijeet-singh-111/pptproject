<?php
// Set headers for the response
/* header('Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation');
header('Content-Disposition: attachment; filename="generated_presentation.pptx"'); */

// Get the HTML content from the POST request body
// Assuming the HTML is sent as JSON: { "html_content": "your html string here" }
$request_body = file_get_contents('php://input');
$data = json_decode($request_body, true); print_r($data); die;

if ($data === null || !isset($data['html_content'])) {
    // Handle missing or invalid data
    header('HTTP/1.1 400 Bad Request');
    header('Content-Type: application/json'); // Change content type for error
    echo json_encode(["error" => "No HTML content provided"]);
    exit; // Stop script execution
}

$html_content = $data['html_content'];

// --- Execute the Python script ---
// Construct the command to run the Python script
// Make sure the path to your Python interpreter and script is correct
// 'path/to/python' should be the command to run Python (e.g., 'python', 'python3', or a full path like '/usr/bin/python3')
// 'path/to/your/script/generate_ppt.py' should be the path to your Python script
$python_script_path = './generate_ppt.py'; // <<< --- Update this path
$python_interpreter = 'python'; // <<< --- Update this if needed (e.g., 'python3')

// Use shell_exec to run the command and capture the output
// We are piping the HTML content into the Python script's standard input
// and capturing the Python script's standard output
$command = escapeshellarg($python_interpreter) . ' ' . escapeshellarg($python_script_path);

// Use proc_open for better error handling if needed, but shell_exec is simpler for basic output capture
// $descriptorspec = array(
//    0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
//    1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
//    2 => array("pipe", "w")   // stderr is a pipe that the child will write to
// );
// $process = proc_open($command, $descriptorspec, $pipes);
// if (is_resource($process)) {
//    fwrite($pipes[0], $html_content); // Write HTML to stdin
//    fclose($pipes[0]); // Close stdin pipe
//    $pptx_output = stream_get_contents($pipes[1]); // Read stdout
//    fclose($pipes[1]); // Close stdout pipe
//    $error_output = stream_get_contents($pipes[2]); // Read stderr (for debugging)
//    fclose($pipes[2]); // Close stderr pipe
//    $return_value = proc_close($process); // Get exit status
//    // You can log $error_output or check $return_value for debugging
// } else {
//     // Handle process opening error
//     header('HTTP/1.1 500 Internal Server Error');
//     header('Content-Type: application/json');
//     echo json_encode(["error" => "Failed to execute Python script."]);
//     exit;
// }

// Simpler approach using shell_exec - output is captured directly
$pptx_output = shell_exec("echo " . escapeshellarg($html_content) . " | " . $command);
echo "echo " . escapeshellarg($html_content) . " | " . $command; die;
if ($pptx_output === null) {
    // Handle execution errors or no output
    header('HTTP/1.1 500 Internal Server Error');
    header('Content-Type: application/json');
    echo json_encode(["error" => "Error executing Python script or no output generated."]);
    // You might need to capture stderr from Python for more detailed errors
    exit;
}

// Output the captured PPTX data
echo $pptx_output;

exit; // Ensure no extra output

?>