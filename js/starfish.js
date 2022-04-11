var Starfish = {
  sign: (msg) => {
    return fetch("http://127.0.0.1:21000/sign", {
      method: 'post',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: msg,
        host: location.host
      })
    }).then((res) => {
      return res.json()
    }).then((res) => {
      if (res.error) {
        throw new Error(res.error)
      } else {
        return res
      }
    }).catch((err) => {
      console.log("err = ", err)
      let e = err.toString()
      if (/.*allowed to request resource.*/.test(e)) {
        alert("Currently Safari is not supported")
      } else {
        let c = confirm("Please install and run StarfishPort")
        if (c) {
          location.href = "https://starfishport.com"
        }
      }
    })
  }
}