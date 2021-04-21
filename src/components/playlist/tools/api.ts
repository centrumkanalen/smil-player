export function api(expression: string): boolean 
{

    let expr = expression.split("=");
    let url = 'https://butikstv.centrumkanalen.com/api/condition/'+expr[0];

    
    
    const item = localStorage.getItem(expr[0]);
    
    if (item) 
    {
        let local = JSON.parse(item);
        let res = Date.now() - local.updated;   
        
        if (res > 60000) 
        {
            xhr(expr[0],url);
        }

        
        if (local.result === true) 
        {
            return true;
        }
        else 
        {
            return false;
        }
        
    }
    else
    {
        xhr(expr[0],url);
        return false;
    }

   
    

}

function xhr(item: string,url: string) {

    let xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", url, true);
    xmlhttp.send();

    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            let res = JSON.parse(this.responseText);

            let result = {
                'updated':Date.now(),
                'result':res.result
            }

            localStorage.setItem(item,JSON.stringify(result));
          
        }
    };
    

}

