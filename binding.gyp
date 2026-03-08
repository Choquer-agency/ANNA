{
  "targets": [
    {
      "target_name": "selected_text",
      "conditions": [
        ["OS=='mac'", {
          "sources": ["native/selected_text.mm"],
          "include_dirs": [
            "<!@(node -p \"require('node-addon-api').include\")"
          ],
          "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
          "xcode_settings": {
            "OTHER_CFLAGS": ["-ObjC++"],
            "OTHER_LDFLAGS": [
              "-framework ApplicationServices",
              "-framework Foundation"
            ],
            "MACOSX_DEPLOYMENT_TARGET": "11.0"
          }
        }]
      ]
    }
  ]
}
