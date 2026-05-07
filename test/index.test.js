const proxyquire = require("proxyquire").noCallThru();
const assert = require("assert");
const { describe, it } = require("mocha");
const sinon = require("sinon");

describe("index", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should export platform", () => {
    const registerPlatformStub = sinon.stub();
    const platformStub = sinon.stub();
    const HomebridgeMock = {
      registerPlatform: registerPlatformStub,
    };
    proxyquire("../index", {
      "./lib/platform": () => ({ HygrothermographPlatform: platformStub }),
    })(HomebridgeMock);
    assert(
      registerPlatformStub.calledWith(
        "homebridge-mi-hygrothermograph-hb2",
        "Hygrotermograph",
        platformStub
      )
    );
  });
});
