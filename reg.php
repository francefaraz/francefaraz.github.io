php
include 'sqlconfig.php';
mysqli_query($conn,"CREATE TABLE freg(sno integer(5) AUTO_INCREMENT unique ,name varchar(20),phone integer(11),email varchar(20)  NOT NULL primary key,clgname varchar(20),stdyear integer(5),refferal varchar(20),password  varchar(15))");
$sql = "ALTER TABLE freg ADD Date&Time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER password";
mysqli_query($conn,$sql);
$name=$_POST['name'];

$phno=$_POST['phone'];

$email=$_POST['email'];

$cname=$_POST['collegename'];

$syear=$_POST['syear'];

$pass=$_POST['password'];
$cpass=$_POST['cpassword'];
//$uname=$_POST['ref'];

$refno=$_POST['refferal'];
echo $cpass;
echo $pass;
$result = mysqli_query($conn, "select * from freg where email='$uid'");
if (mysqli_num_rows($result) > 0) {
    ?>
<script>alert('user already exists');
window.location.href="register.html"
</script>

}
else{
if($cpass!=$pass){
<script>alert('Password does not match');
window.location.href="register.html";
</script>
    
}    



mysqli_query($conn,"INSERT INTO freg(name,phone,email,clgname,stdyear,refferal,password) VALUES('$name',$phno,'$email','$cname','$syear','$refno','$pass')") or die("not inserted");
echo("<script> </script>");
<script>alert('successfully registered');
window.location.href="index.html";
</script>
}
 ?>
