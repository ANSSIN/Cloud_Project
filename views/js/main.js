
$(document).ready(function(){
    $("#myBtn").click(function(){
        $("#myModal").modal();
    });
});

function func(){
    console.log("called main.js");

    var name=document.getElementById('name').value;
    var platform=document.getElementById('platform').value;
    var price=document.getElementById('price').value;
    var location=document.getElementById('location').value;
    $.ajax({
      url:"/api/insertAds",
      type:"POST",
      data:JSON.stringify({ 'name':name , platform : platform, 'price' : price , 'location' : location}),
      contentType:"application/json",
      dataType:"json",
      success: function(data){
            console.log(data);
      }
    });
}
