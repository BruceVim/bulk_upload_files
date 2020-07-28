/*
 基于jq做的，页面必须包含jq
 <script type="text/javascript" src="/js/jquery-1.6.4.min.js"></script>

 要实现图片拖拽，要包含以下js
 <script src="js/jquery.dragsort.js" type="text/javascript"></script>
 */
PhotoShowObjFunction = function()
{
    var _self = this;
    _self.initFlag = false;
    _self.uploadFlag = false;
    _self.showType = 1;
    _self.paramArray = {};
    _self.DocArray = {};
    _self.DocArrayLength = 0;
    _self.List_Max = 0;   //上传总数限制
    _self.showToggle = true;
    _self.allDoneFlag = 0;
    _self.privateObj = {
        showDiv : null,
        coverDiv : null,
        midDiv : null,
        midContentDiv : null,
        uploadNum : 0,
        imgUploadUrl : "/customProduct/product-image-upload-action.php",
        imgManageUrl : "/customProduct/ajax-get-image-action.php",
        ImgType: ["gif", "jpeg", "jpg", "png","pdf", 'doc', 'xls', 'xlsx', 'docx'],
        allDoneFlag : 0,
        OtherTip : '',
        DefaultType : 0,  //上传方式 0 => DOC普通上传,   1 => 图片base64上传
        selectedImages : [],
        uploadedImages : [],
        imgManageParam : []
    };

    _self.postUploadImage = [];
    _self.ranId = function(){
        return Math.floor(Math.random()*100000).toString() + "_" +
            Math.floor(Math.random()*100000).toString() + "_" +
            Math.floor(Math.random()*100000).toString() + "_" +
            Math.floor(Math.random()*100000).toString();
    };

    _self.init = function()
    {
        $("<link>")
            .attr({ rel: "stylesheet",
                type: "text/css",
                href: "css/pic.css"
            })
            .appendTo("head");

        _self.privateObj.showDiv = $('<div></div>');
        _self.privateObj.showDiv.css({
            "display" : "none",
            "font-size" : "14px",
            "z-index" : "99999",
            "width" : "100%"
        });

        _self.privateObj.showDiv.attr('class','photo_obj_class');
        $('body').append(_self.privateObj.showDiv);

        _self.privateObj.coverDiv = $('<div class="pso_cover"></div>');
        _self.privateObj.coverDiv.css({
            "filter" : "alpha(opacity=60)",
            "-moz-opacity" : "0.6",
            "opacity" : "0.6",
            "position" : "fixed",
            //"z-index" : "999",
            //"display" : "none",
            "top" : "0px",
            "background" : "#000000",
            "width" : "100%",
            "height" : "100%"
        });
        _self.privateObj.showDiv.append(_self.privateObj.coverDiv);

        _self.privateObj.midDiv = $('<div class="_midDiv"></div>');
        _self.privateObj.midDiv.css({
            "position" : "absolute",
            //"top" : "150px",
            "width" : "100%",
            "top" : $(document).scrollTop() + 100 + "px"
        });
        _self.privateObj.showDiv.append(_self.privateObj.midDiv);

        _self.privateObj.midContentDiv = $('<div id="drop_area" ></div>');
        _self.privateObj.midContentDiv.css({
            "background" : "#ffffff",
            "margin" : "auto",
            "border" : "2px solid #fefefe",
            "-moz-border-radius" : "6px",
            "-webkit-border-radius" : "6px",
            "border-radius" : "6px",
            "padding" : "0 10px",
            "width": "860px"
        });
        _self.privateObj.midDiv.append(_self.privateObj.midContentDiv);

        _self.midDivInit();

    };

    //初始化显示层的位置
    _self.initMidDiv = function() {
        $('._midDiv').css('top',$(document).scrollTop() + 100 + "px");
    };

    _self.hide = function(){
        if( !_self.initFlag )
            _self.init();

        _self.privateObj.showDiv.hide(200);

        // 清空所选图片
        $(".photo_local_list").empty();
        $(".photo_local_list").html('<li><div class="photo_add chageColor">+<input type="file" class="photo_local_text" value="添加 +"" multiple="" accept="*"  /></div></li>');
    };

    _self.show = function(opts){
        if( !_self.initFlag )
        {
            _self.init();
            _self.initFlag = true;
        }

        _self.privateObj.showDiv.show(200);
    };

    _self.initDocArray = function()
    {
        //清空数组，避免错乱
        _self.DocArray = [];
        _self.DocArray.length = 0;
        _self.DocArrayLength = 0;
        _self.privateObj.selectedImages.length = 0;
        _self.privateObj.selectedImages = [];
        _self.privateObj.uploadedImages.length = 0;
        _self.privateObj.uploadedImages = [];
        _self.privateObj.uploadNum = 0;

    };
    
    _self.midDivInit = function(){
        //初始化图片数组
        _self.initDocArray();
        //图片上传层准备
        if(_self.showType == 1)
        {
            _self.privateObj.midContentDiv.html( _self.getUploadHtml() );
            $("#photoWebGetAction").click(
                function(){
                    if( $(".photo_web_text").val()=="" )
                    {
                        $(".photo_note.photo_web").css("color","red");
                        return;
                    }
                    $(".photo_note.photo_web").css("color","#999");

                    var str = $(".photo_web_text").val().replace("\\","\/");
                    var tmpArray = str.split("\/");
                    str = tmpArray[ tmpArray.length-1 ] || _self.ranId();

                    if ( _self.privateObj.DefaultType == 1 ) {
                        _self.convertImgToBase64( $(".photo_web_text").val(), _self.addWebImage, _self.addWebImageError,str);
                        console.log('base64');
                    } else {
                        _self.addWebDoc($(".photo_web_text").val(),$(".photo_web_text").val());
                        event.preventDefault();

                    }
                    //_self.addWebImage();
                }
            );
            $(".photo_web_text").change(
                function(){
                    if( $(".photo_web_text").val()=="" )
                    {
                        $("#photoWebGetAction").addClass("hui");
                    }else{
                        $("#photoWebGetAction").removeClass("hui");
                    }
                }
            );

            //拖文件上传
            var dc = document.body;
            var dz = document.getElementById('drop_area');
            //拖动进入提醒
            dc.ondragover = function (ev) {
                //阻止浏览器默认打开文件的操作
                ev.preventDefault();
                ev.stopPropagation();
                var Clen = $(".photo_local_list").children().length;
                if ( Clen > 6)
                    Clen = Clen % 6;

                $(".photo_add").css('border','#ccc dashed 2px');
                $(".photo_add").css('width', ( 7-Clen ) * 111 + 'px');

                $("#content").css('width','688px');
                $("#drop_area").css('border','#ccc dashed 2px;');
                $("#contentTip").html('拖拽到这里上传');
            };
            //阻止浏览器默认打开文件的操作
            dc.ondrop = function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            };
            // dc.ondragleave = function () {
            //     //恢复边框变化
            //     $(".photo_add").css('border','#ccc dashed 2px');
            //     $(".photo_add").css('width','88px');
            //     $("#content").css('width','90px');
            //     $("#contentTip").html('+');
            // };
            dz.ondrop = function (event) {
                $(".photo_add").css('border','#ccc dashed 2px');
                $(".photo_add").css('width','88px');
                $("#content").css('width','90px');
                $("#drop_area").css('border','');
                $("#contentTip").html('+');
                //阻止浏览器默认打开文件的操作
                event.preventDefault();
                event.stopPropagation();
                this.files = event.dataTransfer.files;
                upload_files(this.files, event);
            };

            function pushArr(tarArr, index , Arr) {
                if ( 'undefined' ==  typeof ( tarArr[index] )  ) {
                    tarArr[index] = Arr;
                } else {
                    pushArr( tarArr, index + 1, Arr  );
                }
            }

            $(".photo_local_text").change(function (event) {
                upload_files(this.files, event);
            });
            function upload_files( fileObj, event)
            {
                this.files = fileObj;
                if( this.files.length>0 )
                {
                    _self.DocArrayLength += this.files.length;
                    if ( _self.List_Max > 0 && _self.List_Max < _self.DocArrayLength )
                    {
                        _self.DocArrayLength = _self.DocArray.length;  //初始化
                        alert("文件上传限制,至多上传"+ _self.List_Max +"个文件");
                        return false;
                    }

                    for (var i = 0; i< this.files.length; i++ )
                    {

                        if (!RegExp("\.(" + _self.privateObj.ImgType.join("|") + ")$", "i").test(this.files[i].name.toLowerCase())) {
                            console.log("选择文件错误,图片类型必须是" + _self.privateObj.ImgType.join("，") + "中的一种");
                            alert("选择文件错误,图片类型必须是" + _self.privateObj.ImgType.join("，") + "中的一种");
                            _self.midDivInit();
                            break;
                        }
                        var str = this.files[i].name || _self.ranId();

                        pushArr( _self.DocArray, i, this.files[i] );  //针对单个上传被覆盖问题

                        if ( _self.privateObj.DefaultType == 1 ) {
                            _self.convertImgToBase64( _self.getObjectURL(this.files[i]), _self.addLocalImage, null, str );
                            event.preventDefault();
                            console.log('base64');
                        } else {
                            _self.addLocalDoc(_self.getObjectURL(this.files[i]),this.files[i].name );
                            event.preventDefault();
                        }

                    }

                    //图片拖拽，需要加载 jquery.dragsort.js
                    $('#photo_local_list').dragsort("destroy");
                    $('#photo_local_list').dragsort({ dragSelector: "li[class='drop']",dragSelectorExclude:".photo_content_close",dragEnd: saveOrder, placeHolderTemplate: "<li class='placeHolder'></li>" });

                    //拖拽成功后，回调函数
                    function saveOrder() {
                        _self.resetDocArray();

                        _self.resetUploadBtnPos();
                    };

                }
            }

            $("#photoUploadAction").click(function(){
                if( _self.privateObj.uploadNum<=0 )
                    return;

                if( _self.uploadFlag )
                    return;

                _self.uploadFlag = true;
                $(this).addClass("hui");
                $(".photo_web_list").children("li").children("div").each(
                    function(k,v){
                        _self.uploadDataAction( $(this),k );
                    }
                );
                $(".photo_local_list").children("li").children("div").each(
                    function(k,v){
                        _self.uploadDataAction( $(this),k );//弹出子元素标签
                    }
                );

                $("#photoUploadAction").removeClass("hui");
                _self.uploadFlag = false;
                //清空数组，避免错乱
                _self.DocArray = [];
                _self.DocArray.length = 0;

            });
        }
        else if(_self.showType == 2)
        {
            _self.privateObj.midContentDiv.html( _self.getSelectHtml() );
            _self.getPhotoData();
            $("#photoSelectAction").click(function(){
                //_self.selectImg();
                if ( _self.privateObj.selectedImages.length > _self.List_Max )
                {
                    alert("文件上传限制,至多上传"+ _self.List_Max +"个文件");
                    return false;
                }
                _self.selectCallback(_self.privateObj.selectedImages);
                _self.destructorCallback();
            });
        }

        $(".photo_close").click(function(){
            _self.hide();
            _self.destructorCallback();
           // _self.midDivInit();
        });

        $(".pso_cover").click(function(){
            _self.hide();
            _self.destructorCallback();
            //_self.midDivInit();
        });

        $("#uploadDiv").click(function(){
            if(_self.showType == 1)
                return;

            _self.uploadFlag = false;
            //清空数组，避免错乱
           _self.initDocArray();
            _self.showType = 1;
            _self.privateObj.midContentDiv.empty();
            _self.midDivInit();


        });

        $("#selectDiv").click(function(){
            if(_self.showType == 2)
                return;

            _self.uploadFlag = false;
            //清空数组，避免错乱
            _self.initDocArray();
            _self.showType = 2;
            _self.privateObj.midContentDiv.empty();
            _self.midDivInit();
        });
    };

    _self.resetUploadBtnPos = function()
    {
        var upload_btn_obj = $('#upload_btn');
        var last_obj = $('.photo_local_list li').last();

        if ( 'upload_btn' ==  last_obj.attr('id') )
        {
            return false;
        }

        
        last_obj.after(upload_btn_obj);
    };

    _self.addWebImage = function(base64Img,fileName){
        var liTmp = $('<li><div fileName="' + (fileName || _self.ranId()) + '" style="background-image:url(' + base64Img + ');"></div><div class="progress_back" id="b_' + fileName + '"></div><div class="progress_cont" id="c_' + fileName + '"><div class="progress_obj" id="p_' + fileName + '"></div></div><a class="photo_content_close">×</a></li>');
        $(".photo_web_list").append(liTmp);
        $(".photo_web_text").val("");

        liTmp.children(".photo_content_close:last").click(
            function(){
                _self.imageChangeAction(-1);
                $(this).parent().remove();
            }
        );
        _self.imageChangeAction(1);
    };
    _self.addWebImageError = function(){
        $(".photo_note.photo_web").css("color","red");
    };
    _self.addLocalImage = function( base64Img,fileName){
        var liTmp = $('<li><div title="' + (fileName || _self.ranId()) + '" fileName="' + (fileName || _self.ranId()) + '" style="background-image:url(' + base64Img + ');"></div><div class="progress_back" id="b_' + fileName + '"></div><div class="progress_cont" id="c_' + fileName + '"><div class="progress_obj" id="p_' + fileName + '"></div></div><a class="photo_content_close">×</a></li>');
        // $(".photo_local_text").parent().parent().before(liTmp);
        // $('.photo_local_list').append(liTmp);
        $('.photo_local_list > li:last-child').before(liTmp);

        liTmp.children(".photo_content_close:last").click(
            function(){
                _self.imageChangeAction( -1 );
                $(this).parent().remove();
            }
        );
        _self.imageChangeAction(1);
    };
    _self.addLocalDoc = function( base64Img,fileName){
        //var liTmp = $('<li><div title="' + (fileName || _self.ranId()) + '" fileName="' + (fileName || _self.ranId()) + '" style="background-image:url(' + base64Img + ');border: 1px dashed rgb(204, 204, 204);">'+ fileName +'</div><div class="progress_back" id="b_' + fileName + '"></div><div class="progress_cont" id="c_' + fileName + '"><div class="progress_obj" id="p_' + fileName + '"></div></div><a class="photo_content_close">×</a></li>');
        var liTmpStr = '<li class="drop"><div title="\' + (fileName || _self.ranId()) + \'" fileName="\' + (fileName || _self.ranId()) + \'" style="background-image:url(\' + base64Img + \');border: 1px dashed rgb(204, 204, 204);"></div><div class="progress_back" id="b_\' + fileName + \'"></div><div class="progress_cont" id="c_\' + fileName + \'"><div class="progress_obj" id="p_\' + fileName + \'"></div></div><a class="photo_content_close">×</a></li>';
        var liTmp = $('<li class="drop"><div title="' + (fileName || _self.ranId()) + '" fileName="' + (fileName || _self.ranId()) + '" style="background-image:url(' + base64Img + ');border: 1px dashed rgb(204, 204, 204);"></div><div class="progress_back" id="b_' + fileName + '"></div><div class="progress_cont" id="c_' + fileName + '"><div class="progress_obj" id="p_' + fileName + '"></div></div><a class="photo_content_close">×</a></li>');
        // $(".photo_local_text").parent().parent().before(liTmp);
        // $('.photo_local_list').append(liTmp);
        $('.photo_local_list > li:last-child').before(liTmp);

        liTmp.children(".photo_content_close:last").click(
            function(){
                _self.imageChangeAction( -1 );
                $(this).parent().remove();
                _self.resetDocArray();
            }
        );
        _self.imageChangeAction(1);
    };

    _self.addWebDoc = function( base64Img,fileName){
        var liTmp = $('<li>' +
            '<div title="' + (fileName || _self.ranId()) + '" fileName="' + (fileName || _self.ranId()) + '" style="background-image:url(' + base64Img + ');border: 1px dashed rgb(204, 204, 204);">WebImge</div>' +
            '<div class="progress_back" id="b_' + fileName + '"></div><div class="progress_cont" id="c_' + fileName + '">' +
            '<div class="progress_obj" id="p_' + fileName + '"></div></div>' +
            '<a class="photo_content_close">×</a>' +
            '</li>');

        $(".photo_web_list").append(liTmp);
        $(".photo_web_text").val("");

        liTmp.children(".photo_content_close:last").click(
            function(){
                _self.imageChangeAction( -1 );
                $(this).parent().remove();
                _self.resetDocArray();
            }
        );
        _self.imageChangeAction(1);
    };

    //重置文件列表数组
    _self.resetDocArray = function()
    {
        var new_doc_array = [];
        $('#photo_local_list .drop').each(function (k,v) {
            var _title = $(v).find('div:first').attr('title');
            $.each( _self.DocArray, function (_k, _v) {
                if ( _v.name == _title ){
                    new_doc_array[ k ] = _v;
                }
            });
        });

        _self.DocArray = new_doc_array;
    };

    _self.imageChangeAction = function( num ){
        _self.privateObj.uploadNum += num;
        _self.DocArrayLength = _self.privateObj.uploadNum;

        if( _self.privateObj.uploadNum<=0 )
        {
            _self.privateObj.uploadNum = 0;
            _self.DocArrayLength = 0;
            _self.DocArray = [];
            $("#photoUploadAction").addClass("hui");
        }else{
            $("#photoUploadAction").removeClass("hui");
        }
    };

    _self.uploadDataAction = function( divObj, key )
    {

        var imgString = divObj.css("background-image"), fileName = "";
        if(!imgString)
            return;
        if( imgString.indexOf("url")==-1)
            return;

        //var tmpArray = imgString.match(/url\(\"(.*)\"\)/);
        var tmpArray = imgString.match(/url\((.*)\)/);

        if( tmpArray.length <2 )
            return;

        imgString = tmpArray[1];
        var tmpArray = imgString.split(",");
        imgString = tmpArray[1];

        fileName = divObj.attr("fileName");

        var progress_back = document.getElementById("b_" + fileName);
        var progress_cont = document.getElementById("c_" + fileName);
        var progress_obj = document.getElementById("p_" + fileName);


        var formData = new FormData();
        var index = ( key / 3 );
        //formData.append("file", $(".photo_local_text").files[0] );
        formData.append("imgString",imgString);
        formData.append("fileName",fileName );
        formData.append("fileObj",_self.DocArray[ index ] );

        for(var key in _self.paramArray)
        {
            formData.append(key, _self.paramArray[key]);
        }

        $.ajax({
            url : _self.privateObj.imgUploadUrl,
            type : 'POST',
            data : formData,
            // 告诉jQuery不要去处理发送的数据
            processData : false,
            cache : false,
            // 告诉jQuery不要去设置Content-Type请求头
            contentType : false,
            xhr : function(){
                var xhr = $.ajaxSettings.xhr();
                if(onprogress && xhr.upload) {
                    xhr.upload.addEventListener("progress" , function(evt){

                        var loaded = evt.loaded;     //已经上传大小情况
                        var tot = evt.total;      //附件总大小
                        var per = Math.floor(100*loaded/tot);  //已经上传的百分比

                        //$("#b_" + fileName).style.display = "block";
                        //$("#p_" + fileName).style.display = "block";
                        //$("#p_" + fileName).html( per +"%" );
                        //$("#p_" + fileName).css("width" , per +"%");
                        progress_obj.innerHTML = per +"%";
                        progress_obj.style.width = per +"%";

                    }, false);
                    return xhr;
                }
            },
            beforeSend:function(){
                progress_back.style.display = "block";
                progress_cont.style.display = "block";
                _self.beforeSendCallback();
                console.log( "正在上传 " + fileName );
            },
            success : function(responseStr) {
                progress_back.style.display = "none";
                progress_cont.style.display = "none";

                var returnData = JSON.parse(responseStr);
                if(returnData["flag"] == 1)
                {
                    alert(returnData["msg"]);
                    _self.midDivInit();
                    return false;
                }

                //返回图片下标
                returnData['_index'] = index;

                _self.privateObj.uploadedImages.push(returnData["msg"]);
                _self.privateObj.allDoneFlag++;
                //_self.singleUploadCallback(returnData["msg"]);
                _self.singleUploadCallback(returnData);

                if(_self.privateObj.allDoneFlag == _self.privateObj.uploadNum)
                    _self.uploadCallback(_self.privateObj.uploadedImages);
                _self.afterSendCallback();

                _self.destructorCallback();
            },
            error : function(responseStr) {
                progress_back.style.display = "none";
                progress_cont.style.display = "none";
                console.log(responseStr);
                _self.afterSendCallback();
            }
        });

    };
    _self.getUploadHtml = function(){
        var string = '';

        string += '<div class="photo_title">';
        string += '<a class="photo_close chageColor">×</a>';
        string += '<span><a class="photo_select" id="uploadDiv">批量上传图片</a><span style="font-size: 19px">|</span><a class="" id="selectDiv"'+(_self.showToggle == false?' style="display:none"':'')+'>从图库中选择图片</a></span>';
        string += '</div>';

        string += '<div style="margin:30px 20px 40px 20px; padding:0 20px;">';

        // string += '<div class="photo_content"  style="border-bottom:1px solid #ccc; padding:30px 0 50px 0;">';
        // string += '<div class="photo_left">网络图片：</div>';
        // string += '<div class="photo_right">';
        // string += '<div><input type="text" class="photo_web_text" value="" /> <button class="grenBtn chageColor hui" id="photoWebGetAction">提取</button> <span class="photo_note photo_web">请输入网络图片地址</span></div>';
        //
        // string += '<ul class="photo_web_list">';
        // //string += '<li><div style="background-image:url(https://img.yzcdn.cn/upload_files/2016/12/14/59d8ee8e9ee0e77fed0a18043f863d81.jpg?imageView2/2/w/980/h/980/q/75/format/webp);"></div><a class="photo_content_close">×</a></li>';
        // //string += '<li><div style="background-image:url(https://img.alicdn.com/tps/TB16oCFNVXXXXaXXVXXXXXXXXXX-520-280.jpg_.webp);"></div><a class="photo_content_close">×</a></li>';
        // string += '</ul>';
        // string += '</div>';
        // string += '</div>';

        string += '<div class="photo_content" style="margin-top:50px;">';
        string +=  '<p style="color: grey;text-align: center;font-size: 18px;">支持批量拖动文件上传 <span style="color: red;font-size: 15px;">（拖拽图片可调整顺序）</span></p>'
        string += '<div class="photo_left" style="margin-top:10px;" >本地图片：</div>';
        string += '<div class="photo_right">';
        string += '<ul class="photo_local_list" id="photo_local_list">';
        string += '<li id="upload_btn"><div class="photo_add chageColor dropDiv"><span id="contentTip">+</span><input type="file" id="content" class="photo_local_text" value="添加 +"" multiple="" accept="*"  /></div></li>';
        string += '</ul>';
        string += '<div class="photo_note photo_local" style="margin-top:10px;">支持 '+ _self.privateObj.ImgType.join("，")  +' 大小不超过10 MB</div>';
        string += '<div class="photo_note photo_local" style="margin-top:10px;">'+ _self.privateObj.OtherTip  +'</div>';
        string += '</div>';
        string += '</div>';

        string += '</div>';

        string += '<div class="photo_over">';
        string += '<button class="blueBtn hui chageColor" id="photoUploadAction">确认提交</button>';
        string += '</div>';

        return string;
    };

    // 获取图片列表
    _self.getSelectHtml = function(){

        var string = '';

        string += '<div class="photo_title">';
        string += '<a class="photo_close chageColor">×</a>';
        string += '<span><a id="uploadDiv">批量上传图片</a><span style="font-size: 19px">|</span><a class="photo_select" id="selectDiv">从图库中选择图片</a></span>';
        string += '</div>';

        string += '<div style="overflow:hidden">';

        string += '<div class="photo_sel_content">';
        string += '<div class="photo_sel_left">';
        string += '<ul id="sel_type_cont"></ul>';
        string += '</div>';
        string += '<div class="photo_sel_right">';
        string += '<div id="tmp_photo_sel_cont" style="height: 480px;overflow-y: scroll;"></div>';
        // string += '<div class="photo_page_str"></div>';
        string += '</div>';
        string += '</div>';

        string += '</div>';

        string += '<div class="photo_over">';
        string += '<span class="photo_sel_num">已选择<span id="selected_num">0</span>张图片</span>';
        string += '<button class="blueBtn hui chageColor" id="photoSelectAction">确认</button>';
        string += '</div>';

        return string;
    };

    _self.getPhotoData = function(){

        /*
         var photoTypeId = "";
         if(arguments[0])
         photoTypeId = arguments[0];

         var pageId = 1;
         if(arguments[1])
         pageId = arguments[1];

         var _sendString = "?photo_type_id=" + photoTypeId;
         _sendString += "&p=" + pageId;
         */

       // var _sendString = arguments[0];
        var pic_dir = _self.privateObj.imgManageParam.pic_dir;
        var sku = _self.privateObj.imgManageParam.sku;
        if ( sku.length == 0 )
        {
            var tipHtml = '<span>获取失败，请先填写SKU</span> '
            $('#tmp_photo_sel_cont').append(tipHtml);
            return false;
        }
        var tipHtml = '<span>获取中...</span> '
        $('#tmp_photo_sel_cont').append(tipHtml);
        $.ajax({
            url : _self.privateObj.imgManageUrl,
            type : 'GET',
            timeout : 5000, //超时时间设置，单位毫秒
            data : null,
            // 告诉jQuery不要去处理发送的数据
            processData : false,
            cache : false,
            // 告诉jQuery不要去设置Content-Type请求头
            contentType : false,
            dataType : "jsonp",
            jsonp: "callbackparam",//服务端用于接收callback调用的function名的参数
            jsonpCallback:"success_jsonpCallback",//callback的function名称
            beforeSend:function(){
                console.log( "获取中...." );
            },
            success : function(responseStr) {

                var photoArray = responseStr;
                //var _url        = 'http://picxin.mobile21cn.com/p.php?u=' + pic_dir + '/' + sku + '/';
                //cdn 加速
                var _url        = 'http://piccdn.mobile21cn.com/p.php?u=' + pic_dir + '/' + sku + '/';

                if ( null == photoArray )
                {
                    $('#tmp_photo_sel_cont').text('');
                    var tipHtml = '<span>获取失败，请确认当前SKU已上传图片到<span style="color: red">正确的目录下</span></span> '
                    $('#tmp_photo_sel_cont').append(tipHtml);
                    return false;
                }
                // 显示图片
                var selString = "";
                for(var i = 0; i < photoArray.length; i++)
                {
                    var extStart = photoArray[i].lastIndexOf('.');
                    var ext = photoArray[i].substring(extStart,photoArray[i].length).toUpperCase();
                    if( ext == ".BMP" || ext == ".PNG" || ext == ".GIF" || ext == ".JPG" || ext == ".JPEG" )
                    {
                        selString += '<div class="sel_div" ><img  style="width: auto;" data-src="" src="' + _url + photoArray[i] + '" image_name="'+ photoArray[i] +'" title="' + photoArray[i] + '" data-selected="0">' +
                            '<div class="img_name_div" title="' + photoArray[i] + '">' + photoArray[i] + '</div></div>';
                    }
                }
                $("#tmp_photo_sel_cont").empty();
                $("#tmp_photo_sel_cont").html(selString);
                $("#tmp_photo_sel_cont").find(".sel_div img").each(function(){
                    $(this).click(function(){
                        var curItem = {
                            "img_url" : $(this).attr("src"),
                            "img_name" : $(this).attr("image_name")
                        };

                        var selected = $(this).attr("data-selected");

                        if(selected == 0)
                        {
                            _self.privateObj.selectedImages.push(curItem);
                            $(this).attr("data-selected", 1);
                        }else{
                            var delIndex = 0;
                            $.each(_self.privateObj.selectedImages, function(index, item){
                                if(item["img_name"] == curItem["img_name"])
                                {
                                    delIndex = index;
                                    return true;
                                }
                            });

                            _self.privateObj.selectedImages.splice(delIndex, 1);
                            $(this).attr("data-selected", 0);
                        }

                        var imgNum = _self.privateObj.selectedImages.length;
                        $("#selected_num").html(imgNum);

                        if(imgNum > 0)
                            $("#photoSelectAction").removeClass("hui");
                        else
                            $("#photoSelectAction").addClass("hui");

                        $(this).toggleClass("hovered");

                        list_select_pic_main($(this).parent());
                    });
                });
            },
            error : function(responseStr,status) {
                console.log(responseStr);
                $('#tmp_photo_sel_cont').html('');
                var tipHtml = '';
                if(status=='timeout')
                {
                    tipHtml = '<span>获取失败，<span style="color: red">请求超时，请过段时间重试</span></span> '
                }
                else {
                    tipHtml = '<span>获取失败，请确认当前SKU已上传图片到<span style="color: red">正确的目录下</span></span> '
                }


                $('#tmp_photo_sel_cont').append(tipHtml);

                return false;
            },
            // complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
            //     if(status=='timeout'){//超时,status还有success,error等值的情况
            //         ajaxTimeoutTest.abort();
            //         alert("超时");
            //     }
            // }

        });
    }

    _self.getObjectURL = function (file) {
        var url = null;
        if (window.createObjectURL != undefined) {
            url = window.createObjectURL(file)
        } else if (window.URL != undefined) {
            url = window.URL.createObjectURL(file)
        } else if (window.webkitURL != undefined) {
            url = window.webkitURL.createObjectURL(file)
        }
        return url;
    };

    //生成图片的base64编码
    _self.convertImgToBase64 = function(url, callback, callbackError, fileName)
    {
        //html5 的convas画布
        var canvas = document.createElement('CANVAS');
        var ctx = canvas.getContext('2d');
        var img = new Image;
        img.crossOrigin = 'Anonymous';
        img.onload = function(){
            var width = img.width;
            var height = img.height;
            // 按比例压缩4倍
            //var rate = (width<height ? width/height : height/width)/4;
            //原比例生成画布图片
            var rate = 1;
            canvas.width = width*rate;
            canvas.height = height*rate;
            ctx.drawImage(img,0,0,width,height,0,0,width*rate,height*rate);
            // canvas.toDataURL 返回的是一串Base64编码的URL，当然,浏览器自己肯定支持
            var dataURL = canvas.toDataURL( 'image/png' );
            callback.call(this, dataURL,fileName);
            canvas = null;
        };
        img.onerror = function()
        {
            try{
                callbackError.call(this);
            }catch(e){}
        }
        img.src = url;
    };

    _self.convertDocToBase64 = function (file) {

    };

    _self.singleUploadCallback = function(uploadedImage)
    {
        // 单张上传完成后的回调函数
    }

    _self.uploadCallback = function(uploadedImages)
    {
        //console.log(uploadedImages);
    }

    //析构函数
    _self.destructorCallback = function()
    {
      $('.photo_obj_class').remove();
    };

    _self.selectCallback = function(selectedImages)
    {
        // 选择回调

    };
    _self.beforeSendCallback = function( action )
    {
        // 发送前回调
    };
    _self.afterSendCallback = function( action )
    {
        // 发送后回调
    };

    // 需要post的参数
    _self.setParam = function(obj)
    {
        _self.paramArray = obj;
    }

}

function onprogress(evt){
    var loaded = evt.loaded;     //已经上传大小情况
    var tot = evt.total;      //附件总大小
    var per = Math.floor(100*loaded/tot);  //已经上传的百分比
    $("#son").html( per +"%" );
    $("#son").css("width" , per +"%");
}

function list_select_pic_main( obj ) {

    if(  $( obj ).attr( "isSelect")  == 'true' ){
        // 取消选择操作

        //取当前对象数值
        var obj_num = parseInt( $( obj ).attr( "data-bind") );
        // 当前对象 变成 可选
        $( obj ).attr( "isSelect" , "false") ;
        //当前对象数值变成 0
        $( obj ).attr( "data-bind" , 0) ;
        // 当前对象的画面去掉
        $( obj ).find(".overlay").remove();

        var max_num=[];
        $( obj ).siblings().each( function ( i , e) {
            var pic_int =  parseInt ( $(e).attr( "data-bind" ) );
            if( pic_int>obj_num ){
                pic_int = pic_int-1
                $(e).attr( "data-bind" , pic_int);
                //大于当前对象的数值在原有的基础上减一
                // 变更当期的画面值
                $(e).find(".overlay").html(pic_int);
                //max_num.push(pic_int);
            }
        } );

    }
    else{
        var maxINT = 0;
        $( obj ).siblings().each( function ( i , e) {
            var pic_int =  parseInt ( $(e).attr( "data-bind" ) );
            if( pic_int>maxINT ){
                maxINT = pic_int;
            }
        } );
        maxINT++;
        if( maxINT >99 ){
            alert( "不能选择了" );
        }else{
            $( obj ).attr( "data-bind" , maxINT  );
            $( obj ).attr( "isSelect" , 'true'  );
           // $( obj ).append("<div class='overlay' style=\"width:87%;height:87%;position:absolute;z-index:10;left:0;top:0;background-color: rgba(0,0,0,.5);text-align:center;line-height:85px;font-size:36px;color:white;font-weight:bold\">"+maxINT+"</div>");
            $( obj ).append("<div class='overlay' style=\"position:absolute;z-index:10;left:0;top:0;background-color: rgba(0,0,0,.5);text-align:center;line-height:35px;font-size:36px;color:white;font-weight:bold\">"+maxINT+"</div>");
            $( obj ).css( "position", "relative" );
        }

    }

}


// PhotoShowObj = new PhotoShowObjFunction();
