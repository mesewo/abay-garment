import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "@/store/auth-slice";
import { useDispatch } from "react-redux";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Forgot password submitted:", email);
    
    dispatch(forgotPassword({ email })).then((data) => {
      const { payload } = data;
      
      if (payload?.success) {
        toast({
          title: "Email sent",
          description: "If this email exists, a password reset link has been sent",
          variant: "default",
        });
        navigate("/auth/login");
      } else {
        toast({
          title: "Error",
          description: payload?.message || "Error sending password reset email",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Forgot Password
        </h1>
        <p className="mt-2">
          Remember your password?{" "}
          <Link
            className="font-medium text-primary hover:underline"
            to="/auth/login"
          >
            Sign in
          </Link>
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Send Reset Link
        </button>
      </form>
    </div>
  );
}

export default ForgotPassword;