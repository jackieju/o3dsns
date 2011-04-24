// run js dynamically
function evalJs(data){
	re = /<script[\s\S]*?>([\s\S]*)<\/script>/i;
	s = re.test(data);
	if (!s)
		return;
	h = RegExp.$1;
   eval(h);
}

// adjust image size to fix box auto
function AutoImgSize(e, w, h){
	r = e.height/e.width;
	if (e.height>e.width)
	{	
		if (e.height > h){
			e.style.height=h+"px";
			e.style.width=h/r+"px";
//	alert(""+e.style.width+", "+e.style.height);

		}
	}else if(e.width>w){
        e.style.width=w+"px";
		e.style.height=w*r+"px";
	}	
//	alert(""+e.style.width+","+e.style.width);
}
	function AutoAdjustAtchImgSize(e, w, h){
	//	alert(e.height+","+e.width);
		if (e.height>e.width)
		{	
			if (e.height > h)
				e.height=h;
		}else      
		   if(e.width>w)
	                e.width=w;
   	//alert(e.height+","+e.width);
	}


// centerize object auto
function autoPos(a, b){
//	alert("dd"+b);
//	alert($(a).height()+"-"+b.height);
   var c_h = ($(a).height()-b.height)/2;
   var c_w = ($(a).width()-b.width)/2;
    $(b).css("margin-left", c_w);
    $(b).css("margin-top", c_h);
//	alert(c_w+","+c_h);
}

/**
 * show all attribute of one object
 */
 function inspect(obj) { 
     // 用来保存所有的属性名称和值
     var props = "";
     // 开始遍历
     for(var p in obj){ 
         // 方法
         if(typeof(obj[p])=="function"){ 
            // obj[p]();
         }else{ 
             // p 为属性名称，obj[p]为对应属性的值
             props+= p + "=" + obj[p] + "\n";
         } 
     } 
     // 最后显示所有的属性
     alert(props);
 }

/**
 * convert to json object to string
 */
function json_to_s(json, deep){
	s = "{";
	i = 0;
	for(var p in json){
		if (i >0)
			s+=",";
        s+= "\""+p + "\":\"" + json[p] + "\"";
		i = i+1;
	//alert(p+"="+json[p]);
     } 
	s+="}";
	return s;
}

