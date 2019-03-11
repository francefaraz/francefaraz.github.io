<?php
  include 'sqlconfig.php';
session_start();
$uid = $_POST['email'];
$password =$_POST['password'];
if($uid&&$password)
{
	
$result = mysqli_query($conn, "select * from freg where email='$uid'");
if (mysqli_num_rows($result) > 0) {
   
    while($row = mysqli_fetch_assoc($result)) {
     $dbuid= $row['email'];
			$dbpassword=$row['password'];
		}
		if($uid==$dbuid && $password==$dbpassword)
		{
			header("location:index.html");

			$_SESSION['userid']=$uid;
		}
	 else if($uid!=$dbuid || $password!=$dbpassword)
		 ?><script>
               window.location.href="login.html";
            alert("You Entered InCorrect ID/Password ");
            document.password.value.focus();
            </script><?php 
	}
	else 
        ?><script>
    window.location.href="login.html";
    alert("User Doesnt Exist.Kindly Sign Up to Login");
    </script>
<?php

	
}
else
    ?>
    <script>
        window.location.href="login.html";
            alert("Please Enter Username and Password");
</script><?php
    
	

mysqli_close($conn);
?> 











