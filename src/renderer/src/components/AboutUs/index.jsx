import React from 'react';

function AboutUs() {
  
  return (
    <section className="py-2 bg-light d-flex justify-content-between flex-column " style={{height:"70vh"}}>
      {/* <div className="container "> */}
        <div>
        <div className="text-center mb-5">
          <h1 className="display-4 fw-bold text-dark mb-3 ">
            About PNUT Downloader
          </h1>
          <p className="lead text-muted col-md-8 mx-auto">
            We're passionate about making media downloading simple, fast, and reliable for everyone.
          </p>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm ">
              <div className="card-body p-3">
                <h2 className="h4 fw-semibold text-dark mb-3">Our Mission</h2>
                <p className="text-muted">
                  At PNUT Downloader, we strive to empower users by providing a seamless experience to access and manage audio, video, and playlist content. Our goal is to simplify the downloading process while ensuring quality and reliability.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm ">
              <div className="card-body p-3">
                <h2 className="h4 fw-semibold text-dark mb-3">Who We Are</h2>
                <p className="text-muted">
                  We are a dedicated team of developers and designers committed to creating innovative tools for media enthusiasts. Our focus is on user satisfaction and cutting-edge technology.
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
        <div className="text-center mt-3">
          <h2 className="h4 fw-semibold text-dark mb-3">Get in Touch</h2>
          <p className="text-muted mb-2">
            Have questions or need support? We're here to help!
          </p>
          <button
           onClick={() => {
            if (window.api) {
              window.api.openExternal("https://mail.google.com/mail/u/0/#inbox?compose=CllgCJfrLKBgdhRRkNBhXNRKLJkpJSQSqlGdKZdGGVCqZPgGxBmqdPwbBBkwnQxgtfmJWkMbmxB")
            }
          }}
            className="btn btn-danger  px-3 mt-4"
            style={{ background: '#BB4F28', fontSize: 15 }}
          >
            Contact Us
          </button>
        </div>
      {/* </div> */}


    
    </section>
  );
}

export default AboutUs;