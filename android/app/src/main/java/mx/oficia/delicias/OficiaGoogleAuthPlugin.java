package mx.oficia.delicias;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;

@CapacitorPlugin(name = "OficiaGoogleAuth")
public class OficiaGoogleAuthPlugin extends Plugin {

    @PluginMethod
    public void signIn(PluginCall call) {
        String webClientId = call.getString("webClientId");
        if (webClientId == null || webClientId.trim().isEmpty()) {
            call.reject("Falta configurar el cliente web OAuth de Google.");
            return;
        }

        GoogleSignInOptions options = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestIdToken(webClientId)
            .build();
        Intent signInIntent = GoogleSignIn.getClient(getActivity(), options).getSignInIntent();
        startActivityForResult(call, signInIntent, "handleSignInResult");
    }

    @ActivityCallback
    private void handleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getData() == null) {
            if (result.getResultCode() == Activity.RESULT_CANCELED) {
                resolveCancelled(call);
            } else {
                call.reject("GOOGLE_AUTH_NO_RESULT");
            }
            return;
        }

        try {
            GoogleSignInAccount account = GoogleSignIn.getSignedInAccountFromIntent(result.getData())
                .getResult(ApiException.class);
            String idToken = account == null ? null : account.getIdToken();
            if (idToken == null || idToken.isEmpty()) {
                call.reject("GOOGLE_AUTH_NO_ID_TOKEN");
                return;
            }
            JSObject response = new JSObject();
            response.put("idToken", idToken);
            call.resolve(response);
        } catch (ApiException error) {
            if (error.getStatusCode() == 12501) {
                resolveCancelled(call);
            } else {
                call.reject("GOOGLE_AUTH_STATUS_" + error.getStatusCode(), error);
            }
        }
    }

    private void resolveCancelled(PluginCall call) {
        JSObject response = new JSObject();
        response.put("canceled", true);
        call.resolve(response);
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        String webClientId = call.getString("webClientId");
        GoogleSignInOptions.Builder optionsBuilder = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail();
        if (webClientId != null && !webClientId.trim().isEmpty()) optionsBuilder.requestIdToken(webClientId);
        GoogleSignInOptions options = optionsBuilder.build();
        GoogleSignIn.getClient(getActivity(), options).signOut()
            .addOnCompleteListener(task -> call.resolve());
    }
}
